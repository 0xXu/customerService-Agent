from core.customer_data import get_customer_record


def test_customer_records_are_scoped_by_user_and_month():
    path = "data/external/records.csv"

    assert get_customer_record(path, "1001", "2025-01") is not None
    assert get_customer_record(path, "unknown", "2025-01") is None
