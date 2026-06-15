import json
from pathlib import Path

import pytest
from ag_ui.core.types import RunAgentInput, UserMessage
from pydantic_ai import Agent
from pydantic_ai.messages import ToolReturnPart
from pydantic_ai.models.function import AgentInfo, DeltaToolCall, FunctionModel
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


@pytest.mark.asyncio
async def test_stream_completes_tool_call_after_preamble(tmp_path: Path):
    settings = Settings(
        openai_api_key="test",
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'tool-test.db'}",
    )
    database = Database(settings)
    await database.initialize()

    async def stream_function(messages, info: AgentInfo):
        tool_returned = any(
            isinstance(part, ToolReturnPart)
            for message in messages
            for part in message.parts
        )
        if tool_returned:
            yield "最终选购建议"
            return
        yield {
            0: DeltaToolCall(
                name="search_knowledge",
                json_args='{"query":"扫拖一体机选购"}',
                tool_call_id="search-1",
            )
        }

    agent = Agent(FunctionModel(stream_function=stream_function))

    @agent.tool_plain
    async def search_knowledge(query: str) -> str:
        return f"{query}：优先关注导航、基站和防缠绕能力。"

    deps = CustomerAgentDeps(
        settings=settings,
        knowledge=object(),  # type: ignore[arg-type]
        user_id="1001",
    )
    events = [
        decode_event(event)
        async for event in stream_agui_run(
            request=make_request("帮我选购扫拖一体机"),
            agent=agent,  # type: ignore[arg-type]
            deps=deps,
            database=database,
        )
    ]

    content = "".join(
        event.get("delta", "")
        for event in events
        if event["type"] == "TEXT_MESSAGE_CONTENT"
    )
    assert content == "最终选购建议"
    assert "我先检索资料" not in content
    event_types = [event["type"] for event in events]
    assert "TOOL_CALL_START" in event_types
    assert "TOOL_CALL_RESULT" in event_types
    assert event_types.index("TOOL_CALL_START") < event_types.index(
        "TEXT_MESSAGE_CONTENT"
    )

    stored = await database.list_messages("thread-1")
    assert stored[-1]["content"] == "最终选购建议"
    await database.close()
