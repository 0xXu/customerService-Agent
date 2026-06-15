from pathlib import Path

import pytest

from core.database import Database
from core.settings import Settings


@pytest.mark.asyncio
async def test_conversation_and_messages_are_persisted(tmp_path: Path):
    settings = Settings(
        openai_api_key="test",
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
    )
    database = Database(settings)
    await database.initialize()

    await database.append_message(
        conversation_id="thread-1",
        message_id="message-1",
        user_id="1001",
        role="user",
        content="机器人无法回充",
    )
    await database.append_message(
        conversation_id="thread-1",
        message_id="message-2",
        user_id="1001",
        role="assistant",
        content="请先检查充电座。",
    )

    conversations = await database.list_conversations("1001")
    messages = await database.list_messages("thread-1")

    assert conversations[0]["id"] == "thread-1"
    assert conversations[0]["title"] == "机器人无法回充"
    assert [message["role"] for message in messages] == ["user", "assistant"]
    assert messages[-1]["content"] == "请先检查充电座。"
    await database.close()
