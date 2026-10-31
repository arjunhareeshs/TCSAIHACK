"""Runtime settings, read from environment variables prefixed with MOD_."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _env(name: str, default: str) -> str:
    return os.environ.get(f"MOD_{name}", default)


def _env_bool(name: str, default: bool) -> bool:
    return _env(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    projects_dir: Path = field(default_factory=lambda: Path(_env("PROJECTS_DIR", str(BACKEND_ROOT / "projects"))))
    analysis_dir: Path = field(default_factory=lambda: Path(_env("ANALYSIS_DIR", str(BACKEND_ROOT / "analysis"))))

    # LLM
    llm_model: str = field(default_factory=lambda: _env("LLM_MODEL", "anthropic/claude-opus-5-5"))
    llm_fast_model: str = field(default_factory=lambda: _env("LLM_FAST_MODEL", "anthropic/claude-sonnet-5-5"))
    agent_max_iter: int = field(default_factory=lambda: int(_env("AGENT_MAX_ITER", "25")))
    agent_timeout_s: int = field(default_factory=lambda: int(_env("AGENT_TIMEOUT_S", "900")))

    # Orchestration
    concurrency: int = field(default_factory=lambda: int(_env("CONCURRENCY", "4")))
    max_retries: int = field(default_factory=lambda: int(_env("MAX_RETRIES", "2")))
    max_rework_rounds: int = field(default_factory=lambda: int(_env("MAX_REWORK_ROUNDS", "2")))
    partition_max_files: int = field(default_factory=lambda: int(_env("PARTITION_MAX_FILES", "60")))
    partition_max_bytes: int = field(default_factory=lambda: int(_env("PARTITION_MAX_BYTES", str(600 * 1024))))
    gate1_min_read_ratio: float = field(default_factory=lambda: float(_env("GATE1_MIN_READ_RATIO", "0.6")))

    # Tool limits
    read_max_lines: int = 400
    search_max_results: int = 200
    tool_output_max_chars: int = 24_000
    command_timeout_s: int = 120
    max_file_bytes_indexed: int = 1_500_000

    # Permissions that must be switched on explicitly
    allow_db_sampling: bool = field(default_factory=lambda: _env_bool("ALLOW_DB_SAMPLING", False))
    allow_run_tests: bool = field(default_factory=lambda: _env_bool("ALLOW_RUN_TESTS", False))
    allow_network_research: bool = field(default_factory=lambda: _env_bool("ALLOW_NETWORK_RESEARCH", True))


settings = Settings()
