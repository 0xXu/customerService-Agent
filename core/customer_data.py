import csv
from functools import lru_cache
from pathlib import Path


@lru_cache
def load_customer_records(path: str) -> dict[str, dict[str, dict[str, str]]]:
    records: dict[str, dict[str, dict[str, str]]] = {}
    with Path(path).open("r", encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            records.setdefault(row["用户ID"], {})[row["时间"]] = {
                "特征": row["特征"],
                "清洁效率": row["清洁效率"].replace("\\n", "\n"),
                "耗材": row["耗材"].replace("\\n", "\n"),
                "对比": row["对比"],
            }
    return records


def get_customer_record(path: str, user_id: str, month: str) -> dict[str, str] | None:
    return load_customer_records(path).get(user_id, {}).get(month)
