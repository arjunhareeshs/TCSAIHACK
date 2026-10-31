"""Tool bundle used when constructing an interactive CrewAI agent."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from .code_parser import parse_source_code
from .database import fetch_database_rows
from .registry import get_tool_registry
from .sql_analysis import analyze_sql
from .terminal import run_terminal_command


def build_agent_tools(tool_names: Iterable[str] | None = None) -> list[Any]:
    """Register and return the tools requested by an interactive agent."""
    registry = get_tool_registry()
    for tool in (run_terminal_command, fetch_database_rows, parse_source_code, analyze_sql):
        if not any(existing.name == tool.name for existing in registry.all()):
            registry.register(tool)
    return registry.select(tool_names)
