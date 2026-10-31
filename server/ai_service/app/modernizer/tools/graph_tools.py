"""Code graph tools: find_symbol, get_references, trace_calls, get_module_dependencies, trace_request_flow, get_dynamic_markers."""

from __future__ import annotations

import json
import time
from crewai.tools import tool
from app.modernizer.tools.repo_tools import _get_active_ws


@tool("find_symbol")
def find_symbol(name: str, kind: str | None = None) -> str:
    """Find symbol IDs, definitions, file locations and line spans by symbol name."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        sql = "SELECT id, path, name, kind, start_line, end_line, branches, business_shape FROM symbols WHERE name LIKE ?"
        params = [f"%{name}%"]
        if kind:
            sql += " AND kind=?"
            params.append(kind)
        rows = store.query(sql, params)
        res = {"ok": True, "data": rows[:50], "truncated": len(rows) > 50, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "find_symbol", {"name": name, "kind": kind}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("get_references")
def get_references(symbol_id: str) -> str:
    """Find all callers, importers, and references to a specific symbol."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        sym_name = symbol_id.split("::")[-1] if "::" in symbol_id else symbol_id
        edges = store.query("SELECT * FROM edges WHERE dst=? OR dst=?", (symbol_id, sym_name))
        res = {"ok": True, "data": edges, "truncated": False, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "get_references", {"symbol_id": symbol_id}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("trace_calls")
def trace_calls(symbol_id: str, direction: str = "out", depth: int = 2) -> str:
    """Trace call hierarchy for a symbol: 'in' for callers, 'out' for called symbols."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        sym_name = symbol_id.split("::")[-1] if "::" in symbol_id else symbol_id
        if direction == "in":
            rows = store.query("SELECT src, path, line FROM edges WHERE dst=? AND kind='calls' LIMIT 50", (sym_name,))
        else:
            rows = store.query("SELECT dst, path, line FROM edges WHERE src=? AND kind='calls' LIMIT 50", (symbol_id,))
        res = {"ok": True, "data": rows, "truncated": False, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "trace_calls", {"symbol_id": symbol_id, "direction": direction}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("get_module_dependencies")
def get_module_dependencies(module: str) -> str:
    """Get inbound and outbound dependencies and potential circular links for a module."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        outbound = store.query("SELECT DISTINCT dst, path FROM edges WHERE path LIKE ?", (f"%{module}%",))
        inbound = store.query("SELECT DISTINCT src, path FROM edges WHERE dst LIKE ?", (f"%{module}%",))
        res = {"ok": True, "data": {"inbound": inbound[:30], "outbound": outbound[:30]}, "truncated": False, "error": None}
    except Exception as e:
        res = {"ok": False, "data": {}, "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "get_module_dependencies", {"module": module}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("trace_request_flow")
def trace_request_flow(route_or_call: str) -> str:
    """Trace end-to-end request flow: Frontend call -> API Route -> Backend Handler -> Service -> DB."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        routes = store.query("SELECT * FROM routes WHERE path LIKE ? OR handler LIKE ?", (f"%{route_or_call}%", f"%{route_or_call}%"))
        calls = store.query("SELECT * FROM api_calls WHERE url LIKE ?", (f"%{route_or_call}%",))
        res = {"ok": True, "data": {"matched_routes": routes, "matched_frontend_calls": calls}, "truncated": False, "error": None}
    except Exception as e:
        res = {"ok": False, "data": {}, "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "trace_request_flow", {"target": route_or_call}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("get_dynamic_markers")
def get_dynamic_markers(path_glob: str = "*", kind: str | None = None) -> str:
    """Query dynamic code markers (reflection, eval, crons, scheduled jobs, side-effect imports)."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        sql = "SELECT path, line, kind, detail FROM markers WHERE path LIKE ?"
        params = [f"%{path_glob}%"]
        if kind:
            sql += " AND kind=?"
            params.append(kind)
        rows = store.query(sql, params)
        res = {"ok": True, "data": rows[:50], "truncated": len(rows) > 50, "error": None}
    except Exception as e:
        res = {"ok": False, "data": [], "truncated": False, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "get_dynamic_markers", {"path_glob": path_glob}, ms, len(str(res)), res["ok"])
    return json.dumps(res)
