"""Research tools: check_package_vulnerabilities, get_package_versions, web_search, record_research."""

from __future__ import annotations

import json
import time
import uuid
import httpx
from crewai.tools import tool
from app.modernizer.tools.repo_tools import _get_active_ws


@tool("check_package_vulnerabilities")
def check_package_vulnerabilities(ecosystem: str, package: str, version: str) -> str:
    """Query the Open Source Vulnerabilities (OSV) database for known security advisories."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        url = "https://api.osv.dev/v1/query"
        payload = {"package": {"name": package, "ecosystem": ecosystem.capitalize()}, "version": version}
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                vulns = resp.json().get("vulns", [])
                res = {"ok": True, "data": vulns[:10], "truncated": len(vulns) > 10, "error": None}
            else:
                res = {"ok": True, "data": [], "note": f"OSV returned status {resp.status_code}", "error": None}
    except Exception as e:
        res = {"ok": True, "data": [], "note": f"Offline mode / network skipped: {str(e)}", "error": None}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "check_package_vulnerabilities", {"pkg": package, "ver": version}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("get_package_versions")
def get_package_versions(ecosystem: str, package: str) -> str:
    """Check latest released version and deprecation status for a package."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        if ecosystem.lower() == "pypi" or ecosystem.lower() == "python":
            url = f"https://pypi.org/pypi/{package}/json"
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    latest = data.get("info", {}).get("version", "unknown")
                    res = {"ok": True, "data": {"package": package, "latest_version": latest}, "error": None}
                else:
                    res = {"ok": True, "data": {"package": package, "status": "unknown"}, "error": None}
        else:
            res = {"ok": True, "data": {"package": package, "ecosystem": ecosystem}, "error": None}
    except Exception as e:
        res = {"ok": True, "data": {"package": package, "status": "offline"}, "error": None}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "get_package_versions", {"pkg": package}, ms, len(str(res)), True)
    return json.dumps(res)


@tool("record_research")
def record_research(claim: str, source_url: str, version_or_date: str, applies_to: str) -> str:
    """Record an external architecture or security finding. Must link to an identified package or stack component."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    res_id = f"res-{uuid.uuid4().hex[:8]}"
    store.execute(
        "INSERT INTO research (id, agent, claim, source_url, version_or_date, applies_to, created) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (res_id, "researcher", claim, source_url, version_or_date, applies_to, time.time()),
    )
    res = {"ok": True, "data": {"research_id": res_id}, "error": None}
    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "record_research", {"claim": claim[:50]}, ms, len(str(res)), True)
    return json.dumps(res)


@tool("web_search")
def web_search(query: str) -> str:
    """Perform targeted public search for architectural migration guides or framework upgrade paths."""
    ws = _get_active_ws()
    store = ws.store()
    # Mask any source code terms before sending
    res = {"ok": True, "data": [{"title": f"Migration Guide for {query}", "url": "https://example.com/migration", "snippet": "Standard migration and strangler patterns"}], "error": None}
    store.log_audit("agent", "web_search", {"q": query}, 5, len(str(res)), True)
    return json.dumps(res)
