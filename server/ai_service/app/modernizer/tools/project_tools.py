"""Project-scoped discovery and sandboxed checks for modernization agents."""

from __future__ import annotations

import json
import os
import subprocess
import time
from collections import Counter
from pathlib import Path
from typing import Any

from crewai.tools import tool
from langfuse import observe

from app.core.observability import record_tool_output, update_current_span
from app.modernizer.safety import (
    env_names_only,
    is_env_file,
    mask_secrets,
    resolve_inside,
    wrap_untrusted,
)
from app.modernizer.tools.repo_tools import _get_active_ws

MAX_FILES = 2_000
MAX_OUTPUT = 12_000
MAX_READ_LINES = 400
MAX_READ_BYTES = 2_000_000
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}
CHECK_PROFILES: dict[str, tuple[str, ...]] = {
    "git_status": ("git", "status", "--short", "--untracked-files=no"),
    "python_version": ("python", "--version"),
    "node_version": ("node", "--version"),
    "npm_version": ("npm.cmd", "--version"),
}
ENTRYPOINT_NAMES = {
    "main.py", "app.py", "manage.py", "index.js", "index.ts", "main.ts",
    "main.tsx", "vite.config.ts", "vite.config.js", "package.json",
    "docker-compose.yml", "docker-compose.yaml",
}


def _result(data: Any = None, error: str | None = None, truncated: bool = False) -> str:
    payload = {"ok": error is None, "data": data, "truncated": truncated, "error": error}
    output = json.dumps(payload, default=str)
    record_tool_output("project_tool", output)
    update_current_span(output=output[:4_000], metadata={"ok": error is None})
    return output


def _files(root: Path) -> list[Path]:
    found: list[Path] = []
    for current, dirs, names in os.walk(root):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS and not name.startswith(".")]
        for name in names:
            found.append(Path(current) / name)
            if len(found) >= MAX_FILES:
                return found
    return found


@tool("inspect_project_overview")
@observe(name="inspect-project-overview", as_type="tool", capture_input=False, capture_output=False)
def inspect_project_overview(target: str = "all") -> str:
    """Return bounded file, language, size, and top-level directory statistics."""
    started = time.monotonic()
    ws = _get_active_ws()
    files = _files(ws.project_root)
    extensions = Counter(path.suffix.lower() or "[no extension]" for path in files)
    top_level = Counter(path.relative_to(ws.project_root).parts[0] for path in files)
    total_bytes = sum(path.stat().st_size for path in files if path.is_file())
    return _result(
        {
            "project": ws.name,
            "root": str(ws.project_root),
            "file_count": len(files),
            "truncated": len(files) >= MAX_FILES,
            "total_bytes": total_bytes,
            "extensions": extensions.most_common(20),
            "top_level": top_level.most_common(20),
            "elapsed_ms": round((time.monotonic() - started) * 1000),
        },
        truncated=len(files) >= MAX_FILES,
    )


@tool("find_project_entrypoints")
@observe(name="find-project-entrypoints", as_type="tool", capture_input=False, capture_output=False)
def find_project_entrypoints(scope: str = "all") -> str:
    """Find likely application, build, deployment, and configuration entrypoints."""
    ws = _get_active_ws()
    matches = [
        path.relative_to(ws.project_root).as_posix()
        for path in _files(ws.project_root)
        if path.name.lower() in ENTRYPOINT_NAMES
    ]
    return _result(sorted(matches)[:200], truncated=len(matches) > 200)


@tool("read_project_file")
@observe(name="read-project-file", as_type="tool", capture_input=False, capture_output=False)
def read_project_file(path: str, start_line: int = 1, end_line: int = MAX_READ_LINES) -> str:
    """View a bounded line range from a text file inside the active project sandbox."""
    if start_line < 1 or end_line < start_line:
        return _result(error="start_line must be >= 1 and end_line must be >= start_line")
    if end_line - start_line + 1 > MAX_READ_LINES:
        return _result(error=f"A maximum of {MAX_READ_LINES} lines can be read per call")

    ws = _get_active_ws()
    try:
        target = resolve_inside(ws.project_root, path)
        if not target.is_file():
            return _result(error=f"File not found: {path}")
        if target.stat().st_size > MAX_READ_BYTES:
            return _result(error=f"File is larger than the {MAX_READ_BYTES} byte read limit")

        raw = target.read_bytes()
        if b"\x00" in raw[:4096]:
            return _result(error=f"Binary files cannot be viewed as text: {path}")
        content = raw.decode("utf-8", errors="replace")
        content = env_names_only(content) if is_env_file(path) else mask_secrets(content)
        lines = content.splitlines()
        total_lines = len(lines)
        end = min(end_line, total_lines)
        selected = "\n".join(f"{line_number}: {lines[line_number - 1]}" for line_number in range(start_line, end + 1))
        return _result(
            {
                "path": target.relative_to(ws.project_root).as_posix(),
                "content": wrap_untrusted(selected, path),
                "start_line": start_line,
                "end_line": end,
                "total_lines": total_lines,
            },
            truncated=end < total_lines,
        )
    except (OSError, ValueError) as exc:
        return _result(error=f"Unable to read project file: {exc}")


@tool("read_project_manifest")
@observe(name="read-project-manifest", as_type="tool", capture_input=False, capture_output=False)
def read_project_manifest(path: str) -> str:
    """Read a safe project manifest as structured data, masking environment values."""
    ws = _get_active_ws()
    try:
        target = resolve_inside(ws.project_root, path)
        if not target.is_file():
            return _result(error=f"Manifest not found: {path}")
        if target.suffix.lower() == ".json":
            data: Any = json.loads(target.read_text(encoding="utf-8"))
        else:
            text = target.read_text(encoding="utf-8", errors="replace")
            data = mask_secrets(text) if is_env_file(path) else text[:20_000]
        return _result({"path": target.relative_to(ws.project_root).as_posix(), "manifest": data})
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return _result(error=f"Unable to read manifest: {exc}")


@tool("run_project_check")
@observe(name="run-project-check", as_type="tool", capture_input=False, capture_output=False)
def run_project_check(profile: str, timeout_seconds: int = 30) -> str:
    """Run one read-only allowlisted check inside the active project sandbox."""
    if profile not in CHECK_PROFILES:
        return _result(error=f"Unsupported profile: {profile}. Allowed: {sorted(CHECK_PROFILES)}")
    if not 1 <= timeout_seconds <= 60:
        return _result(error="timeout_seconds must be between 1 and 60")

    ws = _get_active_ws()
    try:
        completed = subprocess.run(
            CHECK_PROFILES[profile],
            cwd=ws.project_root,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
            shell=False,
        )
        output = (completed.stdout + completed.stderr).strip()
        if len(output) > MAX_OUTPUT:
            output = output[:MAX_OUTPUT] + "\n[output truncated]"
        return _result(
            {
                "profile": profile,
                "exit_code": completed.returncode,
                "output": output,
                "sandbox_root": str(ws.project_root),
            },
            truncated=len(output) >= MAX_OUTPUT,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return _result(error=f"Project check failed: {exc}")
