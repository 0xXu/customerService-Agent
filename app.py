import asyncio
import json
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from agent.react_agent import ReactAgent

app = FastAPI(title="LangChain ReAct Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_agent: ReactAgent | None = None


def get_agent() -> ReactAgent:
    global _agent
    if _agent is None:
        _agent = ReactAgent()
    return _agent


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat")
async def chat_endpoint(request: Request):
    body = await request.json()
    prompt = str(body.get("prompt", "")).strip()

    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    async def event_generator() -> AsyncGenerator[dict, None]:
        try:
            for chunk in get_agent().execute_stream(prompt):
                for char in chunk:
                    await asyncio.sleep(0.01)
                    yield {
                        "event": "message",
                        "data": json.dumps({"content": char}, ensure_ascii=False),
                    }
        except Exception as exc:
            yield {
                "event": "message",
                "data": json.dumps(
                    {"content": f"\n\n抱歉，系统暂时无法完成请求：{exc}"},
                    ensure_ascii=False,
                ),
            }
        finally:
            yield {
                "event": "done",
                "data": json.dumps({"content": "[DONE]"}, ensure_ascii=False),
            }

    return EventSourceResponse(event_generator())
