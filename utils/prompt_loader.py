from utils.path_tool import get_abs_path


def load_system_prompts() -> str:
    with open(get_abs_path("prompts/main_prompt.txt"), "r", encoding="utf-8") as file:
        return file.read()
