"""Settings for the legacy modernization system. Values come from server/.env (MOD_* keys)."""
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(SERVER_ROOT / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MOD_", extra="ignore")

    llm_model: str = "groq/openai/gpt-oss-120b"
    llm_fast_model: str = "groq/openai/gpt-oss-20b"

    projects_root: Path = SERVER_ROOT / "backend" / "projects"
    analysis_root: Path = SERVER_ROOT / "backend" / "analysis"

    # Orchestration. Groq rate limits are tight, so concurrency stays low.
    max_concurrency: int = 1
    task_timeout_s: int = 240
    max_task_retries: int = 1
    max_rework_rounds: int = 2
    agent_max_iter: int = 10

    # Dynamic allocation: a partition closes when either limit is reached.
    files_per_agent: int = 60
    bytes_per_agent: int = 400_000
    max_partitions_per_agent: int = 3
    rule_candidates_per_task: int = 8
    adjudicate_per_task: int = 6
    adjudicate_max_total: int = 24

    # Tool limits (kept small: the LLM provider has a tokens-per-minute cap).
    max_tool_output_chars: int = 2200
    max_read_lines: int = 60

    min_read_coverage: float = 0.6


def get_settings() -> Settings:
    return Settings()
