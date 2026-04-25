# customerService-Agent

一个扫地机器人客服 Demo，前端使用 React + Vite，后端使用 FastAPI，Agent 基于 LangChain / LangGraph。

## 功能

- 聊天式客服界面
- 最近会话、常用问题、帮助中心页面
- FastAPI 流式接口 `/api/chat`
- 基于 RAG 的扫地机器人知识问答

## 目录

```text
.
├── app.py                # FastAPI 应用
├── server.py             # 后端启动入口
├── frontend/             # React 前端
├── agent/                # Agent 与工具调用逻辑
├── prompts/              # 系统提示词
├── rag/                  # 向量检索相关代码
├── config/               # 配置文件
└── data/                 # 示例数据
```

## 环境要求

- Python 3.11
- Node.js 18+
- `uv`
- `npm`

## 启动

1. 安装后端依赖

```bash
uv sync
```

2. 安装前端依赖

```bash
cd frontend
npm install
```

3. 启动后端

```bash
cd ..
uv run python server.py
```

4. 启动前端

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

启动后访问：

- 前端：`http://127.0.0.1:5173/`
- 后端健康检查：`http://127.0.0.1:8000/health`

## 配置

项目默认从 `.env` 读取模型相关配置。可以先参考 `.env.example` 补齐必要环境变量。

## 说明

这是一个演示项目，不是完整生产系统。当前重点是验证：

- ReAct Agent + RAG 的问答流程
- 前后端分离的客服界面
- 流式输出体验
