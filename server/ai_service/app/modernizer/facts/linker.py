"""Linker: connects frontend API calls to backend routes, and detects dynamic markers."""

from __future__ import annotations

import re
from pathlib import Path
from app.modernizer.store import Store

FASTAPI_ROUTE = re.compile(r"@(?:app|router)\.(get|post|put|delete|patch|options)\s*\(\s*['\"]([^'\"]+)['\"]", re.IGNORECASE)
FRONTEND_FETCH = re.compile(r"(?:fetch|axios\.(?:get|post|put|delete)|apiService\.[a-zA-Z0-9_]+)\s*\(\s*[`'\"]([^`'\"]+)[`'\"]", re.IGNORECASE)
DYNAMIC_CALLS = re.compile(r"(getattr|setattr|eval|exec|__import__|importlib\.import_module)\s*\(")
SIDE_EFFECT_IMPORT = re.compile(r"^\s*import\s+([A-Za-z0-9_]+)\s*(?:#.*noqa.*)?$", re.MULTILINE)


def link_routes_and_markers(root: Path, store: Store) -> dict:
    rows = store.query("SELECT path, language, layer FROM files WHERE relevant=1")
    routes_found = []
    api_calls_found = []
    markers_found = []

    for row in rows:
        path = row["path"]
        lang = row["language"]
        layer = row["layer"]
        full = root / path
        if not full.is_file():
            continue
        try:
            content = full.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        lines = content.splitlines()

        # Route extraction
        if layer == "backend" and lang == "python":
            for lineno, line in enumerate(lines, start=1):
                m = FASTAPI_ROUTE.search(line)
                if m:
                    method = m.group(1).upper()
                    route_path = m.group(2)
                    route_id = f"{path}:{lineno}:{method}:{route_path}"
                    routes_found.append((route_id, method, route_path, "", path, lineno, "fastapi"))

        # Frontend API call extraction
        if layer == "frontend":
            for lineno, line in enumerate(lines, start=1):
                m = FRONTEND_FETCH.search(line)
                if m:
                    url = m.group(1)
                    call_id = f"{path}:{lineno}:{url}"
                    api_calls_found.append((call_id, "ANY", url, path, lineno, ""))

        # Dynamic markers scan
        for lineno, line in enumerate(lines, start=1):
            dm = DYNAMIC_CALLS.search(line)
            if dm:
                markers_found.append((path, lineno, "dynamic_call", dm.group(0)))
            if "noqa" in line.lower() and "import" in line:
                markers_found.append((path, lineno, "side_effect_import", line.strip()))
            if any(term in line.lower() for term in ["cron", "celery.task", "scheduler", "@scheduled"]):
                markers_found.append((path, lineno, "scheduled_job", line.strip()))

    if routes_found:
        store.executemany("INSERT OR REPLACE INTO routes VALUES (?,?,?,?,?,?,?)", routes_found)
    if api_calls_found:
        store.executemany("INSERT OR REPLACE INTO api_calls VALUES (?,?,?,?,?,?)", api_calls_found)
    if markers_found:
        store.executemany("INSERT INTO markers (path, line, kind, detail) VALUES (?,?,?,?)", markers_found)

    return {
        "routes_detected": len(routes_found),
        "api_calls_detected": len(api_calls_found),
        "markers_detected": len(markers_found)
    }
