from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import httpx
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from temporalio.client import Client

from core.customer_data import get_customer_record
from core.retrieval import KnowledgeService
from core.settings import Settings
from core.temporal_workflows import UsageReportWorkflow
from utils.prompt_loader import load_system_prompts


@dataclass
class CustomerAgentDeps:
    settings: Settings
    knowledge: KnowledgeService
    user_id: str
    temporal_client: Client | None = None


def build_customer_agent(settings: Settings) -> Agent[CustomerAgentDeps, str]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is required")

    provider = OpenAIProvider(
        base_url=settings.model_base_url,
        api_key=settings.openai_api_key,
    )
    model = OpenAIChatModel(settings.model_name, provider=provider)
    agent = Agent(
        model,
        deps_type=CustomerAgentDeps,
        output_type=str,
        instructions=load_system_prompts(),
        model_settings={"temperature": settings.model_temperature},
        retries=2,
        tool_timeout=30,
    )

    @agent.tool
    async def search_knowledge(
        ctx: RunContext[CustomerAgentDeps], query: str
    ) -> str:
        """检索产品说明、故障处理、使用建议和维护保养资料。"""
        results = await ctx.deps.knowledge.search(query)
        if not results:
            return "没有找到相关资料。"
        return "\n\n".join(
            f"[{index}] 来源: {item.source}\n{item.content}"
            for index, item in enumerate(results, start=1)
        )

    @agent.tool_plain
    async def get_weather(city: str) -> str:
        """查询城市当前天气；仅在环境因素会影响设备使用时调用。"""
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"https://wttr.in/{city}", params={"format": "j1"})
            response.raise_for_status()
            current = response.json()["current_condition"][0]
        return (
            f"{city}当前温度{current['temp_C']}摄氏度，"
            f"湿度{current['humidity']}%，天气{current['weatherDesc'][0]['value']}。"
        )

    @agent.tool
    async def get_current_user_id(ctx: RunContext[CustomerAgentDeps]) -> str:
        """返回当前已认证用户 ID。"""
        return ctx.deps.user_id

    @agent.tool_plain
    async def get_current_month() -> str:
        """返回当前月份，格式为 YYYY-MM。"""
        return datetime.now().strftime("%Y-%m")

    @agent.tool
    async def fetch_usage_record(
        ctx: RunContext[CustomerAgentDeps], user_id: str, month: str
    ) -> str:
        """获取用户指定月份的设备使用记录，用于生成使用报告。"""
        if user_id != ctx.deps.user_id:
            return "无权访问其他用户的数据。"
        if ctx.deps.temporal_client is not None:
            result = await ctx.deps.temporal_client.execute_workflow(
                UsageReportWorkflow.run,
                {
                    "external_data_path": ctx.deps.settings.external_data_path,
                    "user_id": user_id,
                    "month": month,
                },
                id=f"usage-report-{user_id}-{month}",
                task_queue=ctx.deps.settings.temporal_task_queue,
            )
            record = result["record"]
        else:
            record = get_customer_record(
                ctx.deps.settings.external_data_path, user_id, month
            )
        if record is None:
            return "未找到该月份的使用记录。"
        return "\n".join(f"{key}: {value}" for key, value in record.items())

    return agent
