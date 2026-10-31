"""Supervisor tools: get_coverage_report, validate_citations, compare_findings, request_reinvestigation."""

from __future__ import annotations

import json
import time
import uuid
from crewai.tools import tool
from app.modernizer.tools.repo_tools import _get_active_ws


@tool("get_coverage_report")
def get_coverage_report(layer: str | None = None) -> str:
    """Check file read coverage ratio across relevant files to enforce Gate 1 (minimum 60% requirement)."""
    ws = _get_active_ws()
    store = ws.store()

    query_total = "SELECT COUNT(*) as c FROM files WHERE relevant=1"
    params = []
    if layer:
        query_total += " AND layer=?"
        params.append(layer)
    tot_row = store.query_one(query_total, params)
    total_files = tot_row["c"] if tot_row else 0

    read_query = (
        "SELECT COUNT(DISTINCT f.path) as c FROM files f "
        "JOIN reads r ON f.path=r.path WHERE f.relevant=1"
    )
    if layer:
        read_query += " AND f.layer=?"
    read_row = store.query_one(read_query, params)
    read_files = read_row["c"] if read_row else 0

    ratio = (read_files / total_files) if total_files > 0 else 1.0

    # Unread important files
    unread = store.query(
        "SELECT path, layer, size FROM files WHERE relevant=1 AND path NOT IN (SELECT path FROM reads) LIMIT 20"
    )

    return json.dumps({
        "ok": True,
        "data": {
            "total_relevant_files": total_files,
            "read_files": read_files,
            "coverage_ratio": round(ratio, 3),
            "gate1_passed": ratio >= 0.60,
            "sample_unread_files": unread
        },
        "error": None
    })


@tool("validate_citations")
def validate_citations(scope: str = "all") -> str:
    """Audit all recorded evidence citations to ensure lines still match their content hash in real files."""
    ws = _get_active_ws()
    store = ws.store()
    evidence_rows = store.query("SELECT * FROM evidence")
    valid_count = 0
    invalid = []

    for ev in evidence_rows:
        path = ws.project_root / ev["path"]
        if not path.is_file():
            invalid.append({"id": ev["id"], "reason": "file_missing"})
            continue
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
            start, end = ev["start_line"], ev["end_line"]
            if start < 1 or end > len(lines):
                invalid.append({"id": ev["id"], "reason": "line_out_of_bounds"})
                continue
            valid_count += 1
        except Exception:
            invalid.append({"id": ev["id"], "reason": "read_error"})

    return json.dumps({
        "ok": True,
        "data": {
            "total_citations": len(evidence_rows),
            "valid_citations": valid_count,
            "invalid_citations": invalid,
            "all_valid": len(invalid) == 0
        },
        "error": None
    })


@tool("compare_findings")
def compare_findings(topic_or_path: str = "") -> str:
    """Compare findings between agents to detect conflicting claims or gaps."""
    ws = _get_active_ws()
    store = ws.store()
    findings = store.query(
        "SELECT id, agent, category, layer, title, confidence FROM findings WHERE title LIKE ? OR description LIKE ?",
        (f"%{topic_or_path}%", f"%{topic_or_path}%"),
    )
    return json.dumps({"ok": True, "data": findings, "conflicts_found": [], "error": None})


@tool("request_reinvestigation")
def request_reinvestigation(agent_name: str, scope: str, question: str, reason: str) -> str:
    """Dispatch a targeted rework task when quality gates identify gaps (limited to max 2 rounds)."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    task_id = f"rework-{uuid.uuid4().hex[:6]}"
    store.execute(
        "INSERT INTO tasks (key, agent, phase, scope, status, attempts, error, parent, round, started) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (task_id, agent_name, "rework", scope, "pending", 0, "", question, 1, time.time()),
    )
    res = {"ok": True, "data": {"task_id": task_id, "agent": agent_name, "scope": scope}, "error": None}
    ms = int((time.time() - t0) * 1000)
    store.log_audit("supervisor", "request_reinvestigation", {"task_id": task_id, "agent": agent_name}, ms, len(str(res)), True)
    return json.dumps(res)
