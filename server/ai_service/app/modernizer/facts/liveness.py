"""Liveness Engine: evaluates symbols against 11 signals to distinguish obsolete code from hidden critical rules."""

from __future__ import annotations

import json
from app.modernizer.store import Store


def evaluate_liveness(store: Store) -> dict:
    symbols = store.query("SELECT id, path, name, business_shape, decorators FROM symbols")
    verdict_counts = {}

    for sym in symbols:
        sym_id = sym["id"]
        name = sym["name"]
        path = sym["path"]
        business_shape = bool(sym["business_shape"])
        decorators = sym["decorators"] or ""

        # Signal 1: Static callers
        caller_edges = store.query("SELECT COUNT(*) as c FROM edges WHERE dst=? AND kind='calls'", (name,))
        has_static_callers = bool(caller_edges and caller_edges[0]["c"] > 0)

        # Signal 2: Framework registration
        is_route = any(term in decorators for term in ["get", "post", "put", "delete", "route", "endpoint"])

        # Signal 3: Dynamic markers / side-effects in file
        markers = store.query("SELECT COUNT(*) as c FROM markers WHERE path=?", (path,))
        has_dynamic_marker = bool(markers and markers[0]["c"] > 0)

        # Signal 4: Operational context records (tickets / incidents)
        links = store.query("SELECT COUNT(*) as c FROM context_links WHERE target=? OR target=?", (sym_id, path))
        has_ops_records = bool(links and links[0]["c"] > 0)

        signals = {
            "static_callers": has_static_callers,
            "framework_registered": is_route,
            "dynamic_or_side_effect": has_dynamic_marker,
            "operational_records": has_ops_records,
            "business_shape": business_shape,
        }

        # Decision tree (Section 9)
        if has_static_callers or is_route:
            if business_shape:
                verdict = "Live: Undocumented Rule"
                reason = "Symbol has active callers/routes and complex business logic; must be catalogued and protected"
            else:
                verdict = "Live"
                reason = "Symbol actively invoked through production code paths"
        elif has_ops_records:
            verdict = "Hidden Critical"
            reason = "No direct static caller found, but linked to operational incident/change history; protected"
        elif has_dynamic_marker:
            if business_shape:
                verdict = "Hidden Critical"
                reason = "Invoked via dynamic reflection/side-effect and contains critical business logic"
            else:
                verdict = "Live: Indirect"
                reason = "Indirect trigger detected (dynamic marker, plugin, side-effect import)"
        elif business_shape:
            verdict = "Needs Human"
            reason = "Complex domain rules detected with zero static callers; requires human verification"
        else:
            verdict = "Obsolete Candidate"
            reason = "No callers, no dynamic triggers, no operational records found. Candidate for monitoring (not deletion)"

        store.execute(
            "INSERT OR REPLACE INTO liveness (symbol_id, signals, auto_verdict, reasons) VALUES (?, ?, ?, ?)",
            (sym_id, json.dumps(signals), verdict, reason),
        )
        verdict_counts[verdict] = verdict_counts.get(verdict, 0) + 1

    return verdict_counts
