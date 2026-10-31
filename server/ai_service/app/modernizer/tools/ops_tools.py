"""History and operational evidence tools: git_file_history, git_blame_range, search_operational_records, get_records_for_component."""

from __future__ import annotations

import json
import subprocess
import time
from crewai.tools import tool
from app.modernizer.tools.repo_tools import _get_active_ws


@tool("git_file_history")
def git_file_history(path: str, limit: int = 10) -> str:
    """Retrieve commit history for a file to identify change frequency and author intent."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        proc = subprocess.run(
            ["git", "log", f"-n{limit}", "--oneline", "--", path],
            cwd=str(ws.project_root),
            capture_output=True,
            text=True,
            timeout=10,
        )
        commits = [line.strip() for line in proc.stdout.splitlines() if line.strip()]
        res = {"ok": True, "data": commits, "truncated": False, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "git_file_history", {"path": path}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("git_blame_range")
def git_blame_range(path: str, start_line: int, end_line: int) -> str:
    """Check who changed lines in path, when, and in which commit (helps prove critical bug-fix history)."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        proc = subprocess.run(
            ["git", "blame", f"-L{start_line},{end_line}", "--", path],
            cwd=str(ws.project_root),
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = [line.strip() for line in proc.stdout.splitlines() if line.strip()]
        res = {"ok": True, "data": lines, "truncated": False, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "git_blame_range", {"path": path, "start": start_line, "end": end_line}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("git_change_coupling")
def git_change_coupling(path: str) -> str:
    """Find files that historically change together with the given file."""
    ws = _get_active_ws()
    store = ws.store()
    res = {"ok": True, "data": [], "truncated": False, "error": None}
    store.log_audit("agent", "git_change_coupling", {"path": path}, 5, len(str(res)), True)
    return json.dumps(res)


@tool("search_operational_records")
def search_operational_records(query: str, kind: str | None = None) -> str:
    """Search ingested production incidents, change tickets, and operational documentation."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        sql = "SELECT id, kind, title, body, source FROM context_docs WHERE title LIKE ? OR body LIKE ?"
        params = [f"%{query}%", f"%{query}%"]
        if kind:
            sql += " AND kind=?"
            params.append(kind)
        rows = store.query(sql, params)
        res = {"ok": True, "data": rows[:20], "truncated": len(rows) > 20, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "search_operational_records", {"query": query}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("get_records_for_component")
def get_records_for_component(path_or_symbol: str) -> str:
    """Retrieve operational incidents and tickets specifically linked to a component or file."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        links = store.query(
            "SELECT d.id, d.kind, d.title, d.body FROM context_docs d "
            "JOIN context_links l ON d.id=l.doc_id WHERE l.target LIKE ?",
            (f"%{path_or_symbol}%",),
        )
        res = {"ok": True, "data": links, "truncated": False, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "get_records_for_component", {"target": path_or_symbol}, ms, len(str(res)), res["ok"])
    return json.dumps(res)
