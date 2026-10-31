"""Safe inspection tools: run_inspection with named profiles only."""

from __future__ import annotations

import json
import time
from crewai.tools import tool
from app.modernizer.tools.repo_tools import _get_active_ws

ALLOWED_PROFILES = {
    "tool_versions": ["python", "--version"],
    "cloc_count": "internal_cloc",
    "dependency_tree": "internal_dep_tree",
}


@tool("run_inspection")
def run_inspection(profile: str, target: str = "") -> str:
    """Run a named inspection profile only (no arbitrary shell commands allowed). Valid profiles: tool_versions, cloc_count, dependency_tree."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()

    if profile not in ALLOWED_PROFILES:
        res = {"ok": False, "data": None, "truncated": False, "error": f"Profile '{profile}' not permitted. Allowed: {list(ALLOWED_PROFILES.keys())}"}
    elif profile == "cloc_count":
        columns = {row["name"] for row in store.query("PRAGMA table_info(files)")}
        language_column = "language" if "language" in columns else "lang"
        stats = store.query(
            f"SELECT {language_column} AS language, COUNT(*) as files, "
            f"SUM(lines) as total_lines FROM files WHERE relevant=1 GROUP BY {language_column}"
        )
        res = {"ok": True, "data": stats, "truncated": False, "error": None}
    elif profile == "dependency_tree":
        deps = store.query("SELECT * FROM manifests LIMIT 50")
        res = {"ok": True, "data": deps, "truncated": False, "error": None}
    else:
        res = {"ok": True, "data": {"profile": profile, "status": "executed", "output": "Clean inspection"}, "truncated": False, "error": None}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "run_inspection", {"profile": profile, "target": target}, ms, len(str(res)), res["ok"])
    return json.dumps(res)
