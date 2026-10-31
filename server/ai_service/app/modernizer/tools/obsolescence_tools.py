"""Obsolescence tools: get_liveness_report and submit_liveness_verdict."""

from __future__ import annotations

import json
import time
import uuid
from crewai.tools import tool
from app.modernizer.tools.repo_tools import _get_active_ws

REQUIRED_CHECKS = {
    "exact_name_search",
    "dynamic_markers",
    "scheduled_triggers",
    "operational_records",
    "git_history",
    "function_body",
}

VALID_VERDICTS = {
    "Live",
    "Live: Indirect",
    "Live: Undocumented Rule",
    "Hidden Critical",
    "Needs Human",
    "Obsolete Candidate",
}


@tool("get_liveness_report")
def get_liveness_report(symbol_id: str) -> str:
    """Read the deterministic liveness signals and auto-verdict for a symbol."""
    ws = _get_active_ws()
    store = ws.store()
    row = store.query_one("SELECT * FROM liveness WHERE symbol_id=?", (symbol_id,))
    if not row:
        return json.dumps({"ok": False, "data": None, "error": f"No liveness report found for {symbol_id}"})
    return json.dumps({"ok": True, "data": row, "error": None})


@tool("submit_liveness_verdict")
def submit_liveness_verdict(
    symbol_id: str,
    verdict: str,
    rationale: str,
    evidence_ids: list[str],
    checks_done: list[str]
) -> str:
    """Submit an investigated liveness verdict for a low-liveness symbol.
    Rule enforced: Refused unless ALL 6 required checks are verified in checks_done:
    ['exact_name_search', 'dynamic_markers', 'scheduled_triggers', 'operational_records', 'git_history', 'function_body'].
    Age or old technology is never an acceptable justification for obsolete.
    """
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()

    missing = REQUIRED_CHECKS - set(checks_done)
    if missing:
        return json.dumps({
            "ok": False,
            "error": f"Verdict rejected: missing required checks: {list(missing)}. You must execute and verify all 6 checks before submitting a verdict."
        })

    if verdict not in VALID_VERDICTS:
        return json.dumps({
            "ok": False,
            "error": f"Invalid verdict: {verdict}. Allowed verdicts: {list(VALID_VERDICTS)}"
        })

    if "old" in rationale.lower() and verdict == "Obsolete Candidate":
        return json.dumps({
            "ok": False,
            "error": "Verdict rejected: Code age or old technology has zero weight toward obsolete. Code must have zero triggers and negative operational evidence."
        })

    verdict_id = f"verd-{uuid.uuid4().hex[:8]}"
    store.execute(
        "INSERT INTO verdicts (id, symbol_id, verdict, rationale, evidence_ids, checks, agent, status, created) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (verdict_id, symbol_id, verdict, rationale, json.dumps(evidence_ids), json.dumps(checks_done), "A8-adjudicator", "active", time.time()),
    )
    res = {"ok": True, "data": {"verdict_id": verdict_id, "verdict": verdict}, "error": None}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "submit_liveness_verdict", {"symbol_id": symbol_id, "verdict": verdict}, ms, len(str(res)), True)
    return json.dumps(res)
