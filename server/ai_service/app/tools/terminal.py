"""Constrained terminal access for interactive agents."""

from __future__ import annotations

import os
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path

from crewai.tools import tool
from langfuse import observe
from app.core.observability import record_tool_output, update_current_span

MAX_OUTPUT_CHARS = 20_000
DEFAULT_TIMEOUT_SECONDS = 30
MAX_TIMEOUT_SECONDS = 120
DEFAULT_ALLOWED_COMMANDS = frozenset(
    {"git", "node", "npm", "npx", "python", "pytest", "pip", "uv", "where", "echo"}
)
BLOCKED_TOKENS = frozenset(
    {
        "commit",
        "checkout",
        "clean",
        "del",
        "format",
        "kill",
        "push",
        "remove-item",
        "reset",
        "rm",
        "shutdown",
    }
)


def _allowed_commands() -> frozenset[str]:
    configured = os.getenv("AI_TOOL_ALLOWED_COMMANDS")
    if not configured:
        return DEFAULT_ALLOWED_COMMANDS
    commands = frozenset(item.strip().lower() for item in configured.split(",") if item.strip())
    return commands or DEFAULT_ALLOWED_COMMANDS


def _resolve_working_directory(working_directory: str | None) -> str:
    path = Path(working_directory or os.getcwd()).expanduser().resolve()
    if not path.is_dir():
        raise ValueError(f"Working directory does not exist: {path}")
    return str(path)


@tool("run_terminal_command")
@observe(name="run-terminal-command", as_type="tool", capture_input=False, capture_output=False)
def run_terminal_command(
    command: str,
    working_directory: str | None = None,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
) -> str:
    """Run one approved terminal command and return its exit status and output."""
    command = command.strip()
    if not command:
        raise ValueError("command must not be empty")
    if not 1 <= timeout_seconds <= MAX_TIMEOUT_SECONDS:
        raise ValueError(f"timeout_seconds must be between 1 and {MAX_TIMEOUT_SECONDS}")

    try:
        args = shlex.split(command)
    except ValueError as exc:
        raise ValueError(f"Invalid command syntax: {exc}") from exc
    if not args:
        raise ValueError("command must contain an executable")

    executable = Path(args[0]).name.lower()
    if executable not in _allowed_commands():
        raise ValueError(f"Command is not allowed: {executable}")
    if any(token.lower() in BLOCKED_TOKENS for token in args[1:]):
        raise ValueError("This terminal tool does not allow destructive command arguments")
    if executable in {"python", "python.exe"}:
        args[0] = sys.executable
    elif shutil.which(args[0]) is None:
        raise RuntimeError(f"Command executable was not found: {args[0]}")

    started = time.monotonic()
    try:
        completed = subprocess.run(
            args,
            cwd=_resolve_working_directory(working_directory),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError(f"Command timed out after {timeout_seconds} seconds") from exc
    except OSError as exc:
        raise RuntimeError(f"Unable to run terminal command: {exc}") from exc

    output = (completed.stdout + completed.stderr).strip()
    if len(output) > MAX_OUTPUT_CHARS:
        output = output[:MAX_OUTPUT_CHARS] + "\n[output truncated]"
    elapsed_ms = round((time.monotonic() - started) * 1000)
    result = f"exit_code={completed.returncode}; elapsed_ms={elapsed_ms}\n{output}"
    record_tool_output("run_terminal_command", result)
    update_current_span(output=result[:20_000], metadata={"exit_code": completed.returncode})
    return result
