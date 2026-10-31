"""Evidence and finding tools: cite_code, record_finding, record_business_rule, list_findings.

Enforces deterministic citation gates and evidence verification.
"""

from __future__ import annotations

import hashlib
import json
import time
import uuid
from crewai.tools import tool
from app.modernizer.safety import resolve_inside
from app.modernizer.tools.repo_tools import _get_active_ws


@tool("cite_code")
def cite_code(path: str, start_line: int, end_line: int, note: str = "") -> str:
    """Create a verified citation to specific lines in a file. Lines must exist in the real file. Returns evidence_id."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        target = resolve_inside(ws.project_root, path)
        if not target.is_file():
            return json.dumps({"ok": False, "data": None, "error": f"File does not exist: {path}"})

        lines = target.read_text(encoding="utf-8", errors="replace").splitlines()
        total_lines = len(lines)
        if start_line < 1 or end_line > total_lines or start_line > end_line:
            return json.dumps({
                "ok": False,
                "data": None,
                "error": f"Invalid line range {start_line}-{end_line} (file has {total_lines} lines)"
            })

        snippet = "\n".join(lines[start_line - 1:end_line])
        sha = hashlib.sha1(snippet.encode("utf-8")).hexdigest()
        evidence_id = f"ev-{uuid.uuid4().hex[:8]}"

        store.execute(
            "INSERT INTO evidence (id, kind, path, start_line, end_line, sha, note, agent, created) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (evidence_id, "code", path, start_line, end_line, sha, note, "agent", time.time()),
        )
        res = {"ok": True, "data": {"evidence_id": evidence_id, "sha": sha}, "error": None}
    except Exception as e:
        res = {"ok": False, "data": None, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "cite_code", {"path": path, "start": start_line, "end": end_line}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("record_finding")
def record_finding(
    category: str,
    layer: str,
    title: str,
    description: str,
    confidence: str,
    severity: str,
    evidence_ids: list[str],
    open_question: str = "",
    recommendation: str = ""
) -> str:
    """Record an analysis finding.
    Rules:
    - Verified requires at least 1 evidence_id
    - Inferred requires at least 2 evidence_ids
    - Potential/Unknown requires an open_question
    """
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()

    # Gate rule validation
    conf_norm = confidence.capitalize()
    if conf_norm == "Verified" and len(evidence_ids) < 1:
        return json.dumps({"ok": False, "error": "Verified finding rejected: requires at least 1 verified citation evidence_id."})
    if conf_norm == "Inferred" and len(evidence_ids) < 2:
        return json.dumps({"ok": False, "error": "Inferred finding rejected: requires at least 2 supporting evidence_ids."})
    if conf_norm in ("Potential", "Unknown") and not open_question.strip():
        return json.dumps({"ok": False, "error": f"{conf_norm} finding rejected: requires an explicit open_question."})

    finding_id = f"find-{uuid.uuid4().hex[:8]}"
    store.execute(
        "INSERT INTO findings (id, agent, category, layer, title, description, confidence, severity, likelihood, evidence_ids, open_question, recommendation, status, created) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (finding_id, "agent", category, layer, title, description, conf_norm, severity, "Medium", json.dumps(evidence_ids), open_question, recommendation, "open", time.time()),
    )
    res = {"ok": True, "data": {"finding_id": finding_id}, "error": None}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "record_finding", {"id": finding_id, "title": title}, ms, len(str(res)), True)
    return json.dumps(res)


@tool("record_business_rule")
def record_business_rule(
    rule_id_code: str,
    domain: str,
    title: str,
    description: str,
    trigger: str,
    inputs: str,
    logic: str,
    outputs: str,
    dependencies: str,
    criticality: str,
    evidence_ids: list[str]
) -> str:
    """Record an extracted business rule with all 10 required fields and evidence citations."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()

    if not evidence_ids:
        return json.dumps({"ok": False, "error": "Business rule rejected: must cite at least one evidence_id pointing to code."})

    rule_data = {
        "rule_id_code": rule_id_code,
        "domain": domain,
        "title": title,
        "description": description,
        "trigger": trigger,
        "inputs": inputs,
        "logic": logic,
        "outputs": outputs,
        "dependencies": dependencies,
        "criticality": criticality,
    }
    rule_id = f"rule-{uuid.uuid4().hex[:8]}"
    store.execute(
        "INSERT INTO rules (id, agent, data, evidence_ids, confidence, status, created) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (rule_id, "agent", json.dumps(rule_data), json.dumps(evidence_ids), "Verified", "active", time.time()),
    )
    res = {"ok": True, "data": {"rule_id": rule_id}, "error": None}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "record_business_rule", {"rule_id": rule_id, "title": title}, ms, len(str(res)), True)
    return json.dumps(res)


@tool("list_findings")
def list_findings(category: str | None = None, confidence: str | None = None) -> str:
    """List previously recorded findings to prevent duplicate investigations."""
    ws = _get_active_ws()
    store = ws.store()
    sql = "SELECT id, category, layer, title, confidence, severity FROM findings WHERE status='open'"
    params = []
    if category:
        sql += " AND category=?"
        params.append(category)
    if confidence:
        sql += " AND confidence=?"
        params.append(confidence)
    rows = store.query(sql, params)
    return json.dumps({"ok": True, "data": rows, "error": None})
