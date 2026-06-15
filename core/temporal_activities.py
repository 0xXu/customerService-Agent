from typing import Any

from temporalio import activity

from core.customer_data import get_customer_record


@activity.defn
async def load_usage_record(payload: dict[str, str]) -> dict[str, Any]:
    record = get_customer_record(
        payload["external_data_path"],
        payload["user_id"],
        payload["month"],
    )
    return {
        "user_id": payload["user_id"],
        "month": payload["month"],
        "record": record,
    }
