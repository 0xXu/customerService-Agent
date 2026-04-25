# customerService-Agent

一个面向扫地机器人 / 扫拖一体机场景的智能客服 Demo。项目采用前后端分离架构，前端提供完整的客服工作台界面，后端通过 FastAPI 暴露流式问答接口，Agent 基于 LangChain / LangGraph，结合 RAG 知识检索完成售前咨询、使用指导、故障排查和报告类问答。

## 项目亮点

- 面向具体业务场景：不是通用聊天壳子，而是围绕扫地机器人客服做了页面、问法和知识组织。
- 前后端分离：前端使用 React + Vite，后端使用 FastAPI，接口清晰，便于后续替换模型或接正式业务系统。
- 流式回复体验：`/api/chat` 通过 SSE 按字符返回内容，前端支持“思考中”状态和实时输出。
- ReAct + RAG：Agent 可以根据用户问题调用检索工具补充专业资料，提升设备类问题的回答质量。
- 中间推理不外露：后端已过滤思考过程和工具调用信息，前端只展示最终用户可见答复。
- 多页面客服工作台：除了聊天页，还实现了最近会话、常用问题、帮助中心等典型客服界面模块。
- Markdown 输出优化：长回答支持段落、编号、加粗和列表样式，适合展示维修建议、保养步骤和排障流程。

## 主要功能

### 1. 聊天式智能客服

- 支持售前咨询、使用说明、故障排查、保养建议等问题
- 支持快捷问题一键带入
- 支持流式输出
- 支持“思考中”占位状态

### 2. 最近会话

- 展示最近咨询记录
- 展示会话摘要、标签和更新时间
- 支持将历史会话恢复到当前聊天窗口继续追问

### 3. 常用问题

- 按分类展示高频客服问题
- 支持一键把问题带回聊天区继续咨询

### 4. 帮助中心

- 服务时间
- 保修提示
- 自助排障
- 售后处理流程
- 耗材维护提醒
- 地图与回充指导

### 5. 报告 / 数据类能力

- 支持按用户和月份生成使用情况报告
- 支持通过工具链拉取用户使用记录并生成总结性输出

## 技术栈

### 前端

- React 19
- Vite
- TypeScript
- Framer Motion
- react-markdown

### 后端

- FastAPI
- Uvicorn
- SSE (`sse-starlette`)

### Agent / AI

- LangChain
- LangGraph
- langchain-openai
- langchain-google-genai
- ChromaDB

## 运行流程

```text
用户输入问题
   ↓
React 前端调用 /api/chat
   ↓
FastAPI 接收请求并转为 SSE 流
   ↓
ReactAgent 执行 LangChain / LangGraph Agent
   ↓
按需调用 RAG / 工具函数
   ↓
后端过滤中间思考，只返回最终答复
   ↓
前端实时渲染回复
```

## 目录结构

```text
.
├── app.py                # FastAPI 应用，提供 /health 与 /api/chat
├── server.py             # 后端启动入口
├── frontend/             # React 前端
│   ├── src/App.tsx       # 主界面与页面切换逻辑
│   ├── src/App.css       # 页面样式
│   └── vite.config.ts    # 前端代理配置
├── agent/                # Agent 逻辑与工具
│   ├── react_agent.py    # ReAct Agent 执行入口
│   └── tools/            # 检索、天气、报告等工具
├── prompts/              # 系统提示词与报告提示词
├── rag/                  # 向量检索和 ChromaDB 相关逻辑
├── config/               # yaml 配置
├── data/                 # 示例知识与外部数据
└── README.md
```

## 环境要求

- Python 3.11
- Node.js 18+
- `uv`
- `npm`

## 本地启动

### 1. 安装后端依赖

```bash
uv sync
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 启动后端

```bash
cd ..
uv run python server.py
```

后端默认地址：

- `http://127.0.0.1:8000`
- 健康检查：`http://127.0.0.1:8000/health`

### 4. 启动前端

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

前端默认地址：

- `http://127.0.0.1:5173/`

说明：

- 前端通过 [frontend/vite.config.ts](/Users/huangxu/Desktop/LangChain-ReAct-Agent/frontend/vite.config.ts:1) 将 `/api` 和 `/health` 代理到后端
- 开发时不需要在前端手动写死后端域名

## 接口说明

### `GET /health`

用于健康检查，正常返回：

```json
{"status":"ok"}
```

### `POST /api/chat`

请求体：

```json
{
  "prompt": "机器人无法自动回充怎么办？"
}
```

返回方式：

- SSE 流式返回
- 事件类型包括 `message` 和 `done`

## 配置说明

项目默认从 `.env` 读取模型配置。建议先参考 `.env.example`，补齐你实际使用的模型 Key 或其他必要环境变量。

## 当前已完成

- 前后端分离
- 流式聊天接口
- ReAct Agent 接入
- RAG 检索工具接入
- 最近会话 / 常用问题 / 帮助中心页面
- Markdown 回复渲染
- “思考中”状态展示
- 过滤中间推理，不向用户暴露思考过程

## 说明

这是一个 Demo，不是完整生产系统。当前目标是验证：

- 业务场景化客服界面
- Agent + RAG 问答链路
- 流式交互体验
- 多页面客服工作台的基本形态
