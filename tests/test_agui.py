import json
from pathlib import Path

import pytest
from ag_ui.core.types import RunAgentInput, UserMessage
from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel

from agent.agui import latest_user_text, stream_agui_run
from agent.customer_agent import CustomerAgentDeps
from core.database import Database
from core.settings import Settings


def make_request(content: str = "如何清洁主刷？") -> RunAgentInput:
    return RunAgentInput(
        threadId="thread-1",
        runId="run-1",
        state={},
        messages=[UserMessage(id="user-1", content=content)],
        tools=[],
        context=[],
        forwardedProps={},
    )


def decode_event(encoded: str) -> dict:
    return json.loads(encoded.removeprefix("data: ").strip())


def test_latest_user_text():
    assert latest_user_text(make_request()) == "如何清洁主刷？"


@pytest.mark.asyncio
async def test_stream_emits_valid_agui_lifecycle(tmp_path: Path):
    settings = Settings(
        openai_api_key="test",
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
    )
    database = Database(settings)
    await database.initialize()
    agent = Agent(TestModel(custom_output_text="请先关闭电源，再清理主刷。"))
    deps = CustomerAgentDeps(
        settings=settings,
        knowledge=object(),  # type: ignore[arg-type]
        user_id="1001",
    )

    events = [
        decode_event(event)
        async for event in stream_agui_run(
            request=make_request(),
            agent=agent,  # type: ignore[arg-type]
            deps=deps,
            database=database,
        )
    ]

    assert events[0]["type"] == "RUN_STARTED"
    assert any(event["type"] == "TEXT_MESSAGE_CONTENT" for event in events)
    assert events[-2]["type"] == "TEXT_MESSAGE_END"
    assert events[-1]["type"] == "RUN_FINISHED"

    stored = await database.list_messages("thread-1")
    assert [message["role"] for message in stored] == ["user", "assistant"]
    assert stored[-1]["content"] == "请先关闭电源，再清理主刷。"
    await database.close()
