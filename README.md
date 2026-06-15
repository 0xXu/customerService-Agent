# customerService-Agent

面向扫地机器人与扫拖一体机场景的生产化智能客服。系统使用类型化 Agent、标准前端事件协议、混合检索、持久化会话和 durable workflow，支持知识问答、故障排查、维护建议与用户使用报告。

## 技术架构

```text
React 19
  |
  | AG-UI events over SSE
  v
FastAPI
  |
  +-- PydanticAI typed agent and tools
  +-- PostgreSQL conversations and messages
  +-- Qdrant dense + BM25 hybrid retrieval (RRF)
  +-- Temporal durable usage-report workflow
  +-- MCP-ready PydanticAI runtime
```

### 核心组件

- **PydanticAI**：类型化依赖、工具参数、模型输出和流式执行。
- **AG-UI**：`RUN_STARTED`、`TEXT_MESSAGE_*`、`RUN_FINISHED` 等标准事件。
- **Qdrant**：`BAAI/bge-small-zh-v1.5` dense embedding 与 `Qdrant/bm25` sparse retrieval，通过 RRF 融合。
- **PostgreSQL**：持久化用户会话和消息，连续追问会恢复历史上下文。
- **Temporal**：使用报告数据获取通过可重试、可恢复的 workflow 执行。
- **FastAPI + React**：API 与客服工作台。

项目不再依赖 LangChain、LangGraph、ChromaDB 或手写字符流。

## API

### `POST /api/agent`

接收标准 AG-UI `RunAgentInput`：

```json
{
  "threadId": "thread-id",
  "runId": "run-id",
  "state": {},
  "messages": [
    {
      "id": "message-id",
      "role": "user",
      "content": "机器人无法自动回充怎么办？"
    }
  ],
  "tools": [],
  "context": [],
  "forwardedProps": {}
}
```

响应为 AG-UI SSE 事件流。

### 会话接口

- `GET /api/conversations`
- `GET /api/conversations/{conversation_id}/messages`
- `GET /health`

当前 Demo 通过 `X-User-ID` 请求头识别用户，生产部署应替换为正式认证中间件。

## 本地开发

复制环境变量：

```bash
cp .env.example .env
```

至少配置：

```dotenv
OPENAI_API_KEY=your-key
MODEL_NAME=mimo-v2.5-pro
MODEL_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
```

启动基础设施：

```bash
docker network create gateway-net 2>/dev/null || true
docker compose up -d postgres qdrant temporal
```

启动后端：

```bash
uv sync
uv run python server.py
```

本机运行后端时，`.env.example` 默认使用 SQLite；要连接 Compose PostgreSQL，将 `DATABASE_URL` 改为可从宿主机访问的地址并映射数据库端口。

启动前端：

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

## Docker 部署

```bash
docker network create gateway-net 2>/dev/null || true
docker compose up -d --build
```

首次启动会下载中文 dense 与 BM25 模型并建立知识索引，因此健康检查预留了较长启动时间。模型缓存、Qdrant、PostgreSQL 和运行数据均使用持久卷。

## 验证

```bash
uv run pytest -q
cd frontend
npm run lint
npm run build
```

当前测试覆盖：

- AG-UI 事件生命周期
- PostgreSQL/SQLite 会话持久化
- Agent 输出消息落库
- 知识切块
- 用户月度记录隔离

## 目录

```text
agent/
  agui.py               # PydanticAI 到 AG-UI 的事件适配
  customer_agent.py     # 类型化客服 Agent 与工具
core/
  settings.py           # 环境配置
  database.py           # PostgreSQL/SQLite 数据层
  retrieval.py          # Qdrant dense+sparse 混合检索
  temporal_*.py         # Temporal workflow、activity 与 worker
frontend/
  src/App.tsx           # AG-UI 客服工作台
prompts/
  main_prompt.txt       # 客服安全和行为约束
```
