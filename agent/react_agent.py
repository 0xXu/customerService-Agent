from langchain.agents import create_agent
from langchain_core.messages import AIMessage
from model.factory import chat_model
from utils.prompt_loader import load_system_prompts
from agent.tools.agent_tools import (
    rag_summarize,
    get_weather,
    get_user_location,
    get_user_id,
    get_current_month,
    fetch_external_data,
    fill_context_for_report,
)
from agent.tools.middleware import monitor_tool, log_before_model, report_prompt_switch


def _content_to_text(content) -> str:
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text") or item.get("content")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts).strip()

    return str(content).strip()


def _visible_ai_message(messages) -> tuple[str | None, str]:
    for message in reversed(messages):
        if not isinstance(message, AIMessage):
            continue

        if getattr(message, "tool_calls", None):
            continue

        content = _content_to_text(message.content)
        if not content:
            continue

        message_id = getattr(message, "id", None)
        return str(message_id) if message_id is not None else None, content

    return None, ""


class ReactAgent:
    def __init__(self):
        self.agent = create_agent(
            model=chat_model,
            system_prompt=load_system_prompts(),
            tools=[
                rag_summarize,
                get_weather,
                get_user_location,
                get_user_id,
                get_current_month,
                fetch_external_data,
                fill_context_for_report,
            ],
            middleware=[monitor_tool, log_before_model, report_prompt_switch],
        )

    def execute_stream(self, query: str):
        input_dict = {
            "messages": [
                {"role": "user", "content": query},
            ]
        }

        visible_message_id: str | None = None
        emitted_content = ""

        for chunk in self.agent.stream(input_dict, stream_mode="values", context={"report": False}):
            current_message_id, current_content = _visible_ai_message(chunk["messages"])
            if not current_content:
                continue

            if current_message_id != visible_message_id:
                visible_message_id = current_message_id
                emitted_content = ""

            delta = (
                current_content[len(emitted_content):]
                if current_content.startswith(emitted_content)
                else current_content
            )

            if not delta:
                continue

            emitted_content = current_content
            yield delta


if __name__ == '__main__':
    agent = ReactAgent()

    for chunk in agent.execute_stream("给我生成我的使用报告"):
        print(chunk, end="", flush=True)
