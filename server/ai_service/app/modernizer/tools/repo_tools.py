"""Repository tools: list_tree, find_files, read_file, search_code, file_metadata."""

from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from crewai.tools import tool
from app.modernizer.safety import SafetyError, mask_secrets, resolve_inside, wrap_untrusted, is_env_file, env_names_only
from app.modernizer.workspace import open_workspace

_CURRENT_WORKSPACE_NAME = "question"


def set_active_workspace(name: str) -> None:
    global _CURRENT_WORKSPACE_NAME
    _CURRENT_WORKSPACE_NAME = name


def _get_active_ws():
    return open_workspace(_CURRENT_WORKSPACE_NAME)


@tool("list_tree")
def list_tree(path: str = "", depth: int = 2) -> str:
    """Lists files and folders up to depth relative to project root."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        target = resolve_inside(ws.project_root, path)
        entries = []
        for root, dirs, files in os.walk(target):
            rel = Path(root).relative_to(target).as_posix()
            cur_depth = len(rel.split("/")) if rel != "." else 0
            if cur_depth >= depth:
                dirs.clear()
                continue
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "__pycache__", "checkpoint-260", "checkpoint-312", ".venv", "venv")]
            for f in sorted(files):
                file_rel = (Path(root) / f).relative_to(ws.project_root).as_posix()
                entries.append(file_rel)
                if len(entries) >= 40:
                    break
            if len(entries) >= 40:
                break
        res = {"ok": True, "data": entries, "truncated": len(entries) >= 40, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "list_tree", {"path": path, "depth": depth}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("find_files")
def find_files(glob: str = "*", layer: str | None = None) -> str:
    """Find files in the repository by glob pattern and optional layer (frontend, backend, database, infrastructure)."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        columns = {row["name"] for row in store.query("PRAGMA table_info(files)")}
        language_column = "language" if "language" in columns else "lang"
        query = f"SELECT path, layer, {language_column} AS language, size FROM files WHERE relevant=1"
        params = []
        if layer:
            query += " AND layer=?"
            params.append(layer)
        rows = store.query(query, params)
        regex = re.compile(re.escape(glob).replace(r"\*", ".*").replace(r"\?", "."))
        matches = [r for r in rows if regex.search(r["path"])][:25]
        res = {"ok": True, "data": matches, "truncated": len(matches) >= 25, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "find_files", {"glob": glob, "layer": layer}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("read_file")
def read_file(path: str, start_line: int = 1, end_line: int = 400) -> str:
    """Read line ranges of a source file (maximum 400 lines per call). Marks the file as read for coverage."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        target = resolve_inside(ws.project_root, path)
        if not target.is_file():
            return json.dumps({"ok": False, "data": "", "truncated": False, "error": f"File not found: {path}"})

        content = target.read_text(encoding="utf-8", errors="replace")
        if is_env_file(path):
            content = env_names_only(content)
        else:
            content = mask_secrets(content)

        lines = content.splitlines()
        total_lines = len(lines)
        start = max(1, start_line)
        end = min(total_lines, max(start, end_line))
        if end - start > 80:
            end = start + 80

        selected = [f"{i}: {lines[i-1]}" for i in range(start, end + 1)]
        wrapped_data = wrap_untrusted("\n".join(selected), source=path)
        if len(wrapped_data) > 3500:
            wrapped_data = wrapped_data[:3500] + "\n...[truncated for length]...\n<<<END_REPO_DATA>>>"

        store.record_read("agent", path, start, end)
        res = {
            "ok": True,
            "data": wrapped_data,
            "lines_returned": len(selected),
            "total_lines": total_lines,
            "truncated": end < total_lines,
            "error": None
        }
    except Exception as e:
        res = {"ok": False, "data": "", "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "read_file", {"path": path, "start": start_line, "end": end_line}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("search_code")
def search_code(pattern: str, max_results: int = 15) -> str:
    """Search for a regex or string pattern across code files in the project."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        limit = min(max_results, 15)
        rx = re.compile(pattern, re.IGNORECASE)
        results = []
        rows = store.query("SELECT path FROM files WHERE relevant=1 AND size < 500000")
        for row in rows:
            path = row["path"]
            if any(path.endswith(ext) for ext in (".safetensors", ".bin", ".pt", ".pth", ".parquet", "tokenizer.json", ".jsonl")):
                continue
            target = ws.project_root / path
            if not target.is_file():
                continue
            try:
                text = target.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue

            for lineno, line in enumerate(text.splitlines(), start=1):
                if rx.search(line):
                    results.append({"path": path, "line": lineno, "snippet": mask_secrets(line.strip())[:150]})
                    if len(results) >= limit:
                        break
            if len(results) >= limit:
                break

        res = {"ok": True, "data": results, "truncated": len(results) >= limit, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "search_code", {"pattern": pattern}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("file_metadata")
def file_metadata(path: str) -> str:
    """Retrieve indexed metadata for a specific file (size, language, layer, lines, sha)."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        row = store.query_one("SELECT * FROM files WHERE path=?", (path,))
        res = {"ok": True, "data": row, "truncated": False, "error": None}
    except Exception as e:
        res = {"ok": False, "data": None, "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "file_metadata", {"path": path}, ms, len(str(res)), res["ok"])
    return json.dumps(res)
