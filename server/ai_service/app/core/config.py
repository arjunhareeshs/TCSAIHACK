"""AI Service configuration and environment management.

Loads environment variables from server/.env, server/ai_service/.env, and system environment.
Configures LLM providers (Anthropic, OpenAI, Google Gemini, Ollama) and Langfuse.
"""

from __future__ import annotations

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base paths
AI_SERVICE_ROOT = Path(__file__).resolve().parents[2]
SERVER_ROOT = AI_SERVICE_ROOT.parent
PROJECTS_DEFAULT = SERVER_ROOT / "backend" / "projects"
ANALYSIS_DEFAULT = SERVER_ROOT / "backend" / "analysis"


class AIServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(SERVER_ROOT / ".env"),
            str(AI_SERVICE_ROOT / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service info
    service_name: str = "legacy-modernization-ai-service"
    service_version: str = "1.0.0"
    debug: bool = False

    # Storage paths
    projects_dir: str = str(PROJECTS_DEFAULT)
    analysis_dir: str = str(ANALYSIS_DEFAULT)

    # Primary LLM Model configuration
    # Optimized for Groq (llama-3.3-70b-versatile for reasoning, llama-3.1-8b-instant for fast tasks)
    llm_model: str = "groq/llama-3.3-70b-versatile"
    llm_fast_model: str = "groq/llama-3.1-8b-instant"
    llm_temperature: float = 0.1
    llm_max_tokens: int = 4096

    # API Keys (loaded from env)
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None
    google_api_key: str | None = None
    groq_api_key: str | None = None

    # Supabase (for persistent storage / auth if used)
    supabase_url: str | None = None
    supabase_database_url: str | None = None
    supabase_publishable_key: str | None = None

    # Langfuse observability
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_base_url: str = "https://cloud.langfuse.com"
    langfuse_enabled: bool = True

    # Orchestration parameters
    concurrency: int = 4
    agent_max_iter: int = 25
    agent_timeout_s: int = 900
    max_rework_rounds: int = 2
    gate1_min_read_ratio: float = 0.6
    partition_max_files: int = 60
    partition_max_bytes: int = 600 * 1024

    # Tool limits
    read_max_lines: int = 400
    search_max_results: int = 200
    tool_output_max_chars: int = 24_000
    allow_db_sampling: bool = False
    allow_run_tests: bool = False
    allow_network_research: bool = True


settings = AIServiceSettings()

# Export crucial keys to os.environ so all external libraries (Langfuse, LiteLLM, Groq) find them
if settings.groq_api_key and "GROQ_API_KEY" not in os.environ:
    os.environ["GROQ_API_KEY"] = settings.groq_api_key
if settings.langfuse_public_key and "LANGFUSE_PUBLIC_KEY" not in os.environ:
    os.environ["LANGFUSE_PUBLIC_KEY"] = settings.langfuse_public_key
if settings.langfuse_secret_key and "LANGFUSE_SECRET_KEY" not in os.environ:
    os.environ["LANGFUSE_SECRET_KEY"] = settings.langfuse_secret_key
if settings.langfuse_base_url:
    if "LANGFUSE_BASE_URL" not in os.environ:
        os.environ["LANGFUSE_BASE_URL"] = settings.langfuse_base_url
    if "LANGFUSE_HOST" not in os.environ:
        os.environ["LANGFUSE_HOST"] = settings.langfuse_base_url
