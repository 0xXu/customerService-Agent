from abc import ABC, abstractmethod
import os
from typing import Optional

from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from dotenv import load_dotenv

from utils.config_handler import rag_conf


load_dotenv()


def _get_provider(config_key: str, default: str) -> str:
    return str(rag_conf.get(config_key, default)).strip().lower()


def _get_required_env(env_name: str) -> str:
    value = os.getenv(env_name)
    if not value:
        raise ValueError(f"缺少环境变量 {env_name}，请先配置对应模型服务的 API Key")
    return value


class BaseModelFactory(ABC):
    @abstractmethod
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        pass


class ChatModelFactory(BaseModelFactory):
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        provider = _get_provider("chat_provider", "openai")
        model_name = rag_conf["chat_model_name"]
        temperature = rag_conf.get("temperature", 0.7)

        if provider == "openai":
            return ChatOpenAI(
                model=model_name,
                temperature=temperature,
                api_key=_get_required_env("OPENAI_API_KEY"),
                base_url=rag_conf.get("openai_base_url") or None,
            )

        if provider == "gemini":
            return ChatGoogleGenerativeAI(
                model=model_name,
                temperature=temperature,
                api_key=_get_required_env("GOOGLE_API_KEY"),
            )

        if provider == "deepseek":
            return ChatOpenAI(
                model=model_name,
                temperature=temperature,
                api_key=_get_required_env("DEEPSEEK_API_KEY"),
                base_url=rag_conf.get("deepseek_base_url", "https://api.deepseek.com"),
            )

        raise ValueError(f"不支持的 chat_provider: {provider}，可选值为 openai、gemini、deepseek")


class EmbeddingsFactory(BaseModelFactory):
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        provider = _get_provider("embedding_provider", "openai")
        model_name = rag_conf["embedding_model_name"]

        if provider == "openai":
            return OpenAIEmbeddings(
                model=model_name,
                api_key=_get_required_env("OPENAI_API_KEY"),
                base_url=rag_conf.get("openai_base_url") or None,
            )

        if provider == "gemini":
            return GoogleGenerativeAIEmbeddings(
                model=model_name,
                api_key=_get_required_env("GOOGLE_API_KEY"),
            )

        if provider == "deepseek":
            raise ValueError("DeepSeek 当前不提供此项目可用的 Embedding 模型，请将 embedding_provider 设置为 openai 或 gemini")

        raise ValueError(f"不支持的 embedding_provider: {provider}，可选值为 openai、gemini")


chat_model = ChatModelFactory().generator()

embed_model = EmbeddingsFactory().generator()
