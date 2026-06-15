from datetime import timedelta
from typing import Any

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from core.temporal_activities import load_usage_record


@workflow.defn
class UsageReportWorkflow:
    @workflow.run
    async def run(self, payload: dict[str, str]) -> dict[str, Any]:
        return await workflow.execute_activity(
            load_usage_record,
            payload,
            start_to_close_timeout=timedelta(seconds=30),
        )
