"""Liveness engine: separates code that looks obsolete from code that carries an undocumented rule.

Age, old technology, low commit activity and "rarely called" carry ZERO weight toward obsolete.
Only the absence of every usage signal AND every criticality signal yields OBSOLETE_CANDIDATE,
and even that is a candidate for monitored retirement, never a deletion order.
"""
import json
import re

from .store import Store

LIVE = "LIVE"
LIVE_INDIRECT = "LIVE_INDIRECT"
LIVE_UNDOC = "LIVE_UNDOCUMENTED_RULE"
HIDDEN = "HIDDEN_CRITICAL"
NEEDS_HUMAN = "NEEDS_HUMAN"
OBSOLETE = "OBSOLETE_CANDIDATE"

PROTECTIVE = {LIVE_UNDOC, HIDDEN}
REVIEW_VERDICTS = {LIVE_UNDOC, HIDDEN, NEEDS_HUMAN, OBSOLETE}
FRAMEWORK_DECO = re.compile(r"\b(get|post|put|delete|patch|route|websocket|on_event|task|scheduled_job|fixture|command|validator|property|staticmethod|classmethod|abstractmethod|listener|subscriber)\b")
BUSINESS_THRESHOLD = 4
GENERIC_NAMES = {"main", "run", "get", "set", "init", "handle", "start", "stop", "process", "update", "create", "delete", "load", "save", "build", "test", "setup"}


def family(lang: str) -> str:
    return "js" if lang in ("javascript", "typescript", "vue") else lang


def decide(s: dict) -> str:
    if s["registered"] or s["dunder"] or s["prod_callers"] > 0:
        # containers (classes, UI components) aggregate their children; the individual methods carry the rule
        return LIVE_UNDOC if s["business"] >= BUSINESS_THRESHOLD and not s["documented"] and not s["container"] else LIVE
    if s["records"] > 0 or s["fix_commits"] > 0:
        return HIDDEN
    if s["string_refs"] > 0 or s["config_refs"] > 0 or s["scheduled"] or s["side_effect_file"]:
        return HIDDEN if s["business"] >= BUSINESS_THRESHOLD else LIVE_INDIRECT
    if s["business"] >= BUSINESS_THRESHOLD or s["data_effect"]:
        return NEEDS_HUMAN
    return OBSOLETE


def compute(store: Store) -> dict[str, int]:
    files = {f["path"]: f for f in store.query("SELECT * FROM files")}
    syms = store.query("SELECT * FROM symbols WHERE kind IN ('function','method','class')")
    name_count: dict[str, int] = {}
    for s in syms:
        name_count[s["name"]] = name_count.get(s["name"], 0) + 1

    markers: dict[str, set[str]] = {}
    sched_details: dict[str, list[str]] = {}
    for m in store.query("SELECT path, kind, detail FROM markers"):
        markers.setdefault(m["path"], set()).add(m["kind"])
        if m["kind"] in ("scheduled", "startup_hook", "exit_hook"):
            sched_details.setdefault(m["path"], []).append(m["detail"] or "")

    side_effect_files: set[str] = {r["target"] for r in store.query("SELECT target FROM imports WHERE side_effect=1 AND target IS NOT NULL")}
    routed = {(r["path"], r["handler"]) for r in store.query("SELECT path, handler FROM routes")}
    rec_by_sym = {r["symbol_key"]: r["n"] for r in store.query("SELECT symbol_key, COUNT(DISTINCT record_id) n FROM record_links WHERE symbol_key IS NOT NULL GROUP BY symbol_key")}
    rec_by_path = {r["path"]: r["n"] for r in store.query("SELECT path, COUNT(DISTINCT record_id) n FROM record_links GROUP BY path")}
    git = {g["path"]: g for g in store.query("SELECT * FROM git_stats")}

    mentions: dict[str, list[dict]] = {}
    for m in store.query("SELECT name, path, line, in_string FROM mentions"):
        mentions.setdefault(m["name"], []).append(m)

    out = []
    counts: dict[str, int] = {}
    for s in syms:
        f = files.get(s["path"], {})
        prod = test = cfg = doc = strs = 0
        fam = family(f.get("lang", ""))
        for m in mentions.get(s["name"], []):
            if m["path"] == s["path"] and s["start"] <= m["line"] <= s["end"]:
                continue
            layer = files.get(m["path"], {}).get("layer", "other")
            # a TypeScript `Question` is not a Python `Question`; only config/docs/other may cross languages
            if layer in ("frontend", "backend", "database", "test") and family(files.get(m["path"], {}).get("lang", "")) != fam:
                continue
            if layer == "test":
                test += 1
            elif layer == "docs":
                doc += 1
            elif layer in ("config", "infra", "other"):
                cfg += 1
            else:
                prod += 1
                strs += int(bool(m["in_string"]))
        decos = s["decorators"] or ""
        fm = markers.get(s["path"], set())
        sig = {
            "prod_callers": prod - strs if prod >= strs else 0,
            "string_refs": strs,
            "test_callers": test,
            "config_refs": cfg,
            "documented": doc > 0,
            "registered": bool(FRAMEWORK_DECO.search(decos)) or (s["path"], s["qualname"]) in routed,
            "dunder": s["name"].startswith("__") and s["name"].endswith("__"),
            "scheduled": any(d.startswith(s["qualname"] + ":") for d in sched_details.get(s["path"], [])),
            "dynamic_file": bool(fm & {"reflection", "dynamic_import"}),
            "side_effect_file": s["path"] in side_effect_files,
            "records": max(rec_by_sym.get(s["key"], 0), 0) or 0,
            "records_in_file": rec_by_path.get(s["path"], 0),
            "fix_commits": git.get(s["path"], {}).get("fix_commits", 0) if (s["end"] - s["start"]) >= 3 and s["business"] >= BUSINESS_THRESHOLD else 0,
            "business": s["business"],
            "container": s["kind"] == "class" or (f.get("layer") == "frontend" and s["name"][:1].isupper()),
            "data_effect": bool(s["data_effect"]),
            "ambiguous_name": name_count.get(s["name"], 1) > 1,
            "layer": f.get("layer", "other"),
        }
        verdict = decide(sig)
        counts[verdict] = counts.get(verdict, 0) + 1
        out.append((s["key"], verdict, json.dumps(sig)))
    store.many("INSERT OR REPLACE INTO liveness VALUES (?,?,?)", out)
    return counts


def effective_verdict(store: Store, key: str) -> dict | None:
    """Agent verdict if one is active, otherwise the deterministic one."""
    v = store.one("SELECT * FROM verdicts WHERE symbol_key=? AND status='active'", (key,))
    liv = store.one("SELECT * FROM liveness WHERE symbol_key=?", (key,))
    if v:
        return {"verdict": v["verdict"], "source": "adjudicator", "rationale": v["rationale"],
                "deterministic": liv["verdict"] if liv else None}
    if liv:
        return {"verdict": liv["verdict"], "source": "deterministic", "rationale": "", "deterministic": liv["verdict"]}
    return None


def reopen_stale(store: Store) -> int:
    """Adapt step: verdicts whose symbol source changed since adjudication are reopened."""
    n = 0
    for v in store.query("SELECT v.symbol_key, v.sha, s.sha AS cur FROM verdicts v LEFT JOIN symbols s ON s.key=v.symbol_key WHERE v.status='active'"):
        if v["cur"] != v["sha"]:
            store.run("UPDATE verdicts SET status='stale' WHERE symbol_key=?", (v["symbol_key"],))
            n += 1
    return n
