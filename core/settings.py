from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Customer Service Agent"
    environment: str = "development"

    model_name: str = "mimo-v2.5-pro"
    model_base_url: str = "https://token-plan-cn.xiaomimimo.com/v1"
    openai_api_key: str = ""
    model_temperature: float = 0.2
    model_thinking: str = "disabled"

    database_url: str = "sqlite+aiosqlite:///./runtime/customer_service.db"

    qdrant_url: str = "http://127.0.0.1:6333"
    qdrant_api_key: str | None = None
    qdrant_collection: str = "customer_service_knowledge"
    dense_model: str = "BAAI/bge-small-zh-v1.5"
    sparse_model: str = "Qdrant/bm25"
    retrieval_limit: int = 5
    retrieval_candidates: int = 12

    default_user_id: str = "1001"
    knowledge_path: str = "data"
    external_data_path: str = "data/external/records.csv"

    temporal_address: str = "127.0.0.1:7233"
    temporal_task_queue: str = "customer-service"
    temporal_enabled: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
