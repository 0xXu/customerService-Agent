from contextlib import asynccontextmanager

from ag_ui.core.types import RunAgentInput
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agent.agui import stream_agui_run
from agent.customer_agent import CustomerAgentDeps, build_customer_agent
from core.database import Database
from core.retrieval import KnowledgeService
from core.settings import get_settings
from core.temporal_runtime import TemporalRuntime


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    database = Database(settings)
    knowledge = KnowledgeService(settings)

    await database.initialize()
    await knowledge.initialize()
    temporal = None
    if settings.temporal_enabled:
        temporal = await TemporalRuntime.start(
            settings.temporal_address, settings.temporal_task_queue
        )

    app.state.settings = settings
    app.state.database = database
    app.state.knowledge = knowledge
    app.state.agent = build_customer_agent(settings)
    app.state.temporal = temporal
    yield

    if temporal is not None:
        await temporal.close()
    await knowledge.close()
    await database.close()


app = FastAPI(title="Customer Service Agent API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-User-ID"],
)


@app.get("/health")
async def health(request: Request):
    return {
        "status": "ok",
        "agent": "pydantic-ai",
        "retrieval": "qdrant-hybrid",
        "database": request.app.state.settings.database_url.split(":", 1)[0],
    }


@app.post("/api/agent")
async def run_agent(
    payload: RunAgentInput,
    request: Request,
    x_user_id: str | None = Header(default=None),
):
    prompt_exists = any(message.role == "user" for message in payload.messages)
    if not prompt_exists:
        raise HTTPException(status_code=400, detail="A user message is required")

    settings = request.app.state.settings
    deps = CustomerAgentDeps(
        settings=settings,
        knowledge=request.app.state.knowledge,
        user_id=x_user_id or settings.default_user_id,
        temporal_client=(
            request.app.state.temporal.client
            if request.app.state.temporal is not None
            else None
        ),
    )
    return StreamingResponse(
        stream_agui_run(
            request=payload,
            agent=request.app.state.agent,
            deps=deps,
            database=request.app.state.database,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/conversations")
async def list_conversations(
    request: Request,
    x_user_id: str | None = Header(default=None),
):
    settings = request.app.state.settings
    return await request.app.state.database.list_conversations(
        x_user_id or settings.default_user_id
    )


@app.get("/api/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: str,
    request: Request,
    x_user_id: str | None = Header(default=None),
):
    settings = request.app.state.settings
    return await request.app.state.database.list_messages(
        conversation_id, x_user_id or settings.default_user_id
    )
