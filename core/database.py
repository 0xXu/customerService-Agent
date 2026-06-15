from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from core.settings import Settings


class Base(DeclarativeBase):
    pass


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Database:
    def __init__(self, settings: Settings):
        if settings.database_url.startswith("sqlite"):
            Path("runtime").mkdir(exist_ok=True)
        self.engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def initialize(self) -> None:
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async def close(self) -> None:
        await self.engine.dispose()

    async def append_message(
        self,
        *,
        conversation_id: str,
        message_id: str,
        user_id: str,
        role: str,
        content: str,
    ) -> None:
        async with self.sessions() as session:
            conversation = await session.get(Conversation, conversation_id)
            if conversation is None:
                conversation = Conversation(
                    id=conversation_id,
                    user_id=user_id,
                    title=content[:80] if role == "user" else "新对话",
                )
                session.add(conversation)
            else:
                conversation.updated_at = datetime.now(timezone.utc)

            session.add(
                Message(
                    id=message_id,
                    conversation_id=conversation_id,
                    role=role,
                    content=content,
                )
            )
            await session.commit()

    async def list_messages(
        self, conversation_id: str, user_id: str | None = None
    ) -> list[dict[str, Any]]:
        async with self.sessions() as session:
            statement = (
                select(Message)
                .join(Conversation, Conversation.id == Message.conversation_id)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at)
            )
            if user_id is not None:
                statement = statement.where(Conversation.user_id == user_id)
            result = await session.execute(statement)
            return [
                {
                    "id": message.id,
                    "role": message.role,
                    "content": message.content,
                    "created_at": message.created_at.isoformat(),
                }
                for message in result.scalars()
            ]

    async def list_conversations(self, user_id: str) -> list[dict[str, Any]]:
        async with self.sessions() as session:
            result = await session.execute(
                select(Conversation)
                .where(Conversation.user_id == user_id)
                .order_by(Conversation.updated_at.desc())
            )
            return [
                {
                    "id": conversation.id,
                    "title": conversation.title,
                    "updated_at": conversation.updated_at.isoformat(),
                }
                for conversation in result.scalars()
            ]
