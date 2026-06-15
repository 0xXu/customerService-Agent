from __future__ import annotations

from collections.abc import AsyncIterator
from uuid import uuid4

from ag_ui.core.events import (
    RunErrorEvent,
    RunFinishedEvent,
    RunStartedEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
    TextMessageStartEvent,
)
from ag_ui.core.types import RunAgentInput
from ag_ui.encoder import EventEncoder
from pydantic_ai import Agent
from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, UserPromptPart

from agent.customer_agent import CustomerAgentDeps
from core.database import Database


def latest_user_text(request: RunAgentInput) -> str:
    for message in reversed(request.messages):
        if message.role == "user":
            content = message.content
            if isinstance(content, str):
                return content.strip()
            if isinstance(content, list):
                parts = [
                    str(item.text)
                    for item in content
                    if getattr(item, "text", None)
                ]
                return "".join(parts).strip()
    return ""


async def stream_agui_run(
    *,
    request: RunAgentInput,
    agent: Agent[CustomerAgentDeps, str],
    deps: CustomerAgentDeps,
    database: Database,
) -> AsyncIterator[str]:
    encoder = EventEncoder(accept="text/event-stream")
    assistant_message_id = str(uuid4())
    prompt = latest_user_text(request)

    yield encoder.encode(
        RunStartedEvent(threadId=request.thread_id, runId=request.run_id)
    )
    if not prompt:
        yield encoder.encode(
            RunErrorEvent(message="A user message is required", code="INVALID_INPUT")
        )
        return

    user_message_id = str(getattr(request.messages[-1], "id", None) or uuid4())
    stored_messages = await database.list_messages(request.thread_id)
    message_history = [
        (
            ModelRequest(parts=[UserPromptPart(content=item["content"])])
            if item["role"] == "user"
            else ModelResponse(parts=[TextPart(content=item["content"])])
        )
        for item in stored_messages
        if item["role"] in {"user", "assistant"}
    ]
    await database.append_message(
        conversation_id=request.thread_id,
        message_id=user_message_id,
        user_id=deps.user_id,
        role="user",
        content=prompt,
    )

    yield encoder.encode(
        TextMessageStartEvent(messageId=assistant_message_id, role="assistant")
    )
    chunks: list[str] = []
    try:
        async with agent.run_stream(
            prompt,
            deps=deps,
            message_history=message_history,
            conversation_id=request.thread_id,
        ) as result:
            async for delta in result.stream_text(delta=True, debounce_by=0.02):
                chunks.append(delta)
                yield encoder.encode(
                    TextMessageContentEvent(
                        messageId=assistant_message_id, delta=delta
                    )
                )

        content = "".join(chunks)
        await database.append_message(
            conversation_id=request.thread_id,
            message_id=assistant_message_id,
            user_id=deps.user_id,
            role="assistant",
            content=content,
        )
        yield encoder.encode(TextMessageEndEvent(messageId=assistant_message_id))
        yield encoder.encode(
            RunFinishedEvent(
                threadId=request.thread_id,
                runId=request.run_id,
                result={"messageId": assistant_message_id},
            )
        )
    except Exception as exc:
        yield encoder.encode(TextMessageEndEvent(messageId=assistant_message_id))
        yield encoder.encode(
            RunErrorEvent(message="客服服务暂时不可用", code=type(exc).__name__)
        )
