"""Deterministic deliverables generated from the evidence store (no LLM, fully traceable)."""
import json
import re
from collections import defaultdict

from . import liveness as lv
from .linker import find_cycles
from .workspace import Workspace

PROTECTED = (lv.HIDDEN, lv.LIVE_UNDOC)
DEBT_CATS = ("technical_debt", "security", "dependency", "reliability", "performance")
SEV_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


def _evid(ws: Workspace, fid: int) -> str:
    rows = ws.store.query("SELECT e.id,e.path,e.start,e.end FROM finding_evidence fe JOIN evidence e ON e.id=fe.evidence_id WHERE fe.finding_id=?", (fid,))
    return ", ".join(f"[E{r['id']}] {r['path']}:{r['start']}-{r['end']}" for r in rows[:4]) or "none"


def _cell(text: str, n: int = 160) -> str:
    return re.sub(r"\s+", " ", str(text or "")).replace("|", "/")[:n]


def _effective(ws: Workspace) -> list[dict]:
    return ws.store.query(
        "SELECT s.key, s.path, s.start, s.end, s.business, f.module, COALESCE(v.verdict, l.verdict) verdict, "
        "CASE WHEN v.verdict IS NULL THEN 'deterministic' ELSE 'adjudicator' END source, v.rationale, l.signals "
        "FROM symbols s JOIN files f ON f.path=s.path JOIN liveness l ON l.symbol_key=s.key "
        "LEFT JOIN verdicts v ON v.symbol_key=s.key AND v.status='active' WHERE s.kind IN ('function','method','class')")


def rule_catalogue(ws: Workspace) -> None:
    rules = ws.store.query("SELECT * FROM findings WHERE category='business_rule' AND status='active' ORDER BY id")
    out = [f"# Business Rule Catalogue\n\n{len(rules)} rule(s) recorded by agents, each with citations. Confidence is Verified, Inferred, Potential or Unknown.\n"]
    for r in rules:
        p = json.loads(r["payload"] or "{}")
        out.append(f"## R-{r['id']}: {_cell(p.get('rule', r['title']), 120)}\n")
        for k, label in (("rule", "Description"), ("source_file", "Source file"), ("code_location", "Code location"), ("related_symbol", "Related function/API/object"),
                         ("input_conditions", "Input conditions"), ("expected_behaviour", "Expected behaviour"), ("related_components", "Related components"),
                         ("business_impact", "Potential business impact"), ("open_questions", "Unresolved questions for humans")):
            out.append(f"- **{label}:** {p.get(k) or '-'}")
        out.append(f"- **Evidence:** {_evid(ws, r['id'])}\n- **Confidence:** {r['confidence']} (recorded by {r['agent']})\n")
    cands = [e for e in _effective(ws) if e["verdict"] == lv.LIVE_UNDOC][:40]
    out.append("## Candidate rules not yet analysed\n\nLive code with business-rule shape and no documentation mention. Treat as protected until an agent or person has read it.\n")
    out += ["| Symbol | Location | Business score |", "|---|---|---|"] + [f"| `{c['key'].split('::')[-1]}` | {c['path']}:{c['start']}-{c['end']} | {c['business']} |" for c in cands]
    ws.doc_path("business_rule_catalogue").write_text("\n".join(out) + "\n", encoding="utf-8")


def dependency_map(ws: Workspace) -> None:
    st = ws.store
    calls = st.query("SELECT c.method,c.pattern,c.path cpath,c.line cline,r.method rmethod,r.full_pattern,r.path rpath,r.handler FROM api_calls c LEFT JOIN routes r ON r.id=c.route_id ORDER BY c.path,c.line")
    out = ["# Dependency and Relationship Map\n", "## Frontend to backend (request flow)\n", "```mermaid", "flowchart LR"]
    for i, c in enumerate(calls[:30]):
        fe = f'F{i}["{c["cpath"].rsplit("/", 1)[-1]}:{c["cline"]}"]'
        if c["full_pattern"]:
            be = f'B{i}["{c["rmethod"]} {c["full_pattern"]}<br/>{(c["handler"] or "").split(".")[-1]}"]'
            out.append(f"  {fe} --> {be}")
        else:
            out.append(f'  {fe} --> X{i}["{c["method"]} {c["pattern"]}: no backend match"]')
    out += ["```\n", "| Frontend call | Backend route | Handler | Evidence |", "|---|---|---|---|"]
    out += [f"| {c['method']} `{c['pattern']}` | {('`' + c['full_pattern'] + '`') if c['full_pattern'] else '**unmatched**'} | {c['handler'] or '-'} | {c['cpath']}:{c['cline']} |" for c in calls]
    edges: dict[tuple[str, str], int] = defaultdict(int)
    mod = {f["path"]: f["module"] for f in st.query("SELECT path,module FROM files")}
    for r in st.query("SELECT path,target FROM imports WHERE target IS NOT NULL"):
        a, b = mod.get(r["path"]), mod.get(r["target"])
        if a and b and a != b:
            edges[(a, b)] += 1
    out += ["\n## Module dependencies (resolved project-internal imports)\n", "```mermaid", "flowchart LR"]
    ids = {m: f"M{i}" for i, m in enumerate(sorted({x for e in edges for x in e}))}
    top = sorted(edges.items(), key=lambda kv: -kv[1])[:30]
    out += [f'  {ids[a]}["{a}"] -->|{n}| {ids[b]}["{b}"]' for (a, b), n in top]
    out.append("```\n")
    cycles = find_cycles(st)
    out.append("## Circular dependencies\n")
    out += [f"- {' -> '.join(c)}" for c in cycles] or ["None found among resolved imports."]
    db = st.query("SELECT name,kind,path,line FROM db_objects")
    out.append("\n## Database objects found in files\n")
    out += [f"- {d['kind']} `{d['name']}` ({d['path']}:{d['line']})" for d in db] or ["None. The application may use a schemaless store or an external database; see database.md."]
    out.append("\n> Import and call links are name-based and heuristic. Verified claims about them are in the layer documents with citations.")
    ws.doc_path("dependency_map").write_text("\n".join(out) + "\n", encoding="utf-8")


def heatmap(ws: Workspace) -> list[dict]:
    st = ws.store
    mods: dict[str, dict] = defaultdict(lambda: {"files": 0, "protected": 0, "inb": 0, "outb": 0, "fix": 0, "rec": 0, "debt": 0, "dep": 0, "syms": 0, "tested": 0, "retire": 0})
    mod = {}
    for f in st.query("SELECT path,module FROM files WHERE relevant=1"):
        mod[f["path"]] = f["module"]
        mods[f["module"]]["files"] += 1
    for e in _effective(ws):
        m = mods.get(e["module"])
        if m is None:
            continue
        m["syms"] += 1
        m["protected"] += int(e["verdict"] in PROTECTED)
        m["retire"] += int(e["verdict"] == lv.OBSOLETE and e["source"] == "adjudicator")
        m["tested"] += int(json.loads(e["signals"]).get("test_callers", 0) > 0)
    for r in st.query("SELECT path,target FROM imports WHERE target IS NOT NULL"):
        a, b = mod.get(r["path"]), mod.get(r["target"])
        if a and b and a != b:
            mods[a]["outb"] += 1
            mods[b]["inb"] += 1
    for g in st.query("SELECT path,fix_commits FROM git_stats"):
        if g["path"] in mod:
            mods[mod[g["path"]]]["fix"] += g["fix_commits"]
    for r in st.query("SELECT DISTINCT record_id,path FROM record_links"):
        if r["path"] in mod:
            mods[mod[r["path"]]]["rec"] += 1
    for f in st.query("SELECT f.id,f.category,e.path FROM findings f JOIN finding_evidence fe ON fe.finding_id=f.id JOIN evidence e ON e.id=fe.evidence_id WHERE f.status='active'"):
        if f["path"] in mod:
            key = "dep" if f["category"] == "dependency" else ("debt" if f["category"] in DEBT_CATS else None)
            if key:
                mods[mod[f["path"]]][key] += 1
    for r in st.query("SELECT payload FROM findings WHERE category='business_rule' AND status='active'"):
        sf = json.loads(r["payload"] or "{}").get("source_file")
        if sf in mod:
            mods[mod[sf]]["protected"] += 1
    rows = []
    for name, m in mods.items():
        if not m["files"]:
            continue
        s = {
            "criticality": 1 + min(4, m["protected"] // 3),
            "coupling": 1 + min(4, (m["inb"] + m["outb"]) // 4),
            "change_risk": 1 + min(4, (m["fix"] + m["rec"]) // 2),
            "debt": 1 + min(4, m["debt"]),
            "test_safety": 1 + int(4 * (m["tested"] / m["syms"])) if m["syms"] else 1,
            "upgrade_pressure": 1 + min(4, m["dep"]),
        }
        if s["criticality"] >= 4 and s["coupling"] >= 3 and s["test_safety"] <= 2:
            strat = "Retain and wrap: write characterization tests first, then strangler pattern"
        elif s["debt"] >= 4 and s["coupling"] <= 2:
            strat = "Refactor in place"
        elif s["upgrade_pressure"] >= 4 and s["debt"] <= 3:
            strat = "Replatform or upgrade dependencies"
        elif m["retire"] and s["criticality"] <= 2:
            strat = "Retire confirmed-obsolete parts after a monitored period and human sign-off"
        else:
            strat = "Retain; modernize opportunistically"
        rows.append({"module": name, "files": m["files"], **s, "strategy": strat, "protected": m["protected"]})
    rows.sort(key=lambda r: -(r["criticality"] + r["coupling"] + r["change_risk"] + r["debt"]))
    out = ["# Modernization Heat Map\n", "Scores 1 (low) to 5 (high); for test_safety, 5 is safest. Computed from index, Git history, operational records, findings and verdicts. "
           "**Technology age alone never raises criticality or triggers a rewrite or deletion recommendation.**\n",
           "| Module | Files | Criticality | Coupling | Change risk | Debt | Test safety | Upgrade pressure | Suggested strategy |", "|---|---|---|---|---|---|---|---|---|"]
    out += [f"| {r['module']} | {r['files']} | {r['criticality']} | {r['coupling']} | {r['change_risk']} | {r['debt']} | {r['test_safety']} | {r['upgrade_pressure']} | {r['strategy']} |" for r in rows]
    ws.doc_path("modernization_heatmap").write_text("\n".join(out) + "\n", encoding="utf-8")
    opts = ["# Migration Options\n", "Each option is suggested per module from the heat map. Benefits and risks must be confirmed by the target architecture review.\n",
            "| Module | Strategy | Why | Main risk | Validation |", "|---|---|---|---|---|"]
    for r in rows:
        why = f"criticality {r['criticality']}, coupling {r['coupling']}, test safety {r['test_safety']}, debt {r['debt']}"
        opts.append(f"| {r['module']} | {r['strategy']} | {why} | regression in undocumented behaviour ({r['protected']} protected item(s)) | characterization tests green before and after |")
    ws.doc_path("migration_options").write_text("\n".join(opts) + "\n", encoding="utf-8")
    return rows


def review_queue(ws: Workspace) -> None:
    eff = _effective(ws)
    out = ["# Human Review Queue\n", "Nothing here is a deletion order. Each item needs a named person to decide. Items marked 'deterministic' have not yet been challenged by the Obsolescence Adjudicator.\n"]
    groups = (
        (lv.HIDDEN, "Hidden critical code: looks unused but evidence says it matters. Protect, confirm the rule."),
        (lv.LIVE_UNDOC, "Live code with an undocumented business rule. Protect, document, add characterization tests."),
        (lv.NEEDS_HUMAN, "Mixed evidence. A person must decide."),
        (lv.OBSOLETE, "Obsolete candidates: no usage and no criticality signal found. Recommended action: add usage logging for an agreed period, then human sign-off. Never delete directly."),
    )
    for verdict, text in groups:
        items = [e for e in eff if e["verdict"] == verdict]
        out.append(f"## {verdict} ({len(items)})\n\n{text}\n")
        if items:
            out += ["| Symbol | Location | Decided by | Rationale |", "|---|---|---|---|"]
            out += [f"| `{e['key'].split('::')[-1]}` | {e['path']}:{e['start']}-{e['end']} | {e['source']} | {_cell(e['rationale'], 140)} |" for e in sorted(items, key=lambda e: e["source"])[:60]]
            if len(items) > 60:
                out.append(f"\n_{len(items) - 60} more not shown._")
        out.append("")
    open_q = ws.store.query("SELECT id,agent,title,open_question,confidence FROM findings WHERE status='active' AND open_question!='' ORDER BY id")
    out.append(f"## Open questions from findings ({len(open_q)})\n")
    out += [f"- F-{q['id']} [{q['confidence']}] {_cell(q['title'], 90)}: {_cell(q['open_question'], 160)}" for q in open_q[:50]]
    stale = ws.store.query("SELECT id,title FROM findings WHERE status='stale'")
    stale_v = ws.store.query("SELECT symbol_key FROM verdicts WHERE status='stale'")
    out.append(f"\n## Reopened because evidence changed ({len(stale) + len(stale_v)})\n")
    out += [f"- finding F-{s['id']}: {_cell(s['title'], 90)}" for s in stale] + [f"- verdict for `{v['symbol_key']}`" for v in stale_v]
    ws.doc_path("review_queue").write_text("\n".join(out) + "\n", encoding="utf-8")


def problem_catalogue(ws: Workspace) -> None:
    rows = ws.store.query("SELECT * FROM findings WHERE status='active' AND category!='business_rule' AND severity!='info' ORDER BY id")
    rows.sort(key=lambda r: (SEV_ORDER.get(r["severity"], 9), r["id"]))

    def table(title: str, sel: list[dict], intro: str) -> str:
        t = [f"# {title}\n", intro + "\n", "| ID | Problem | Category | Severity | Confidence | Evidence | Found by | Validation needed |", "|---|---|---|---|---|---|---|---|"]
        t += [f"| P-{r['id']} | {_cell(r['title'], 90)}: {_cell(r['description'], 150)} | {r['category']} | {r['severity']} | {r['confidence']} | {_evid(ws, r['id'])} | {r['agent']} | {_cell(r['open_question'], 100) or 'confirm in review'} |" for r in sel]
        return "\n".join(t) + "\n"

    ws.doc_path("problem_catalogue").write_text(table("Problem Catalogue", rows, "Every problem cites evidence. Technical problems and business risks are kept as separate categories; modernization opportunities are not mandatory changes."), encoding="utf-8")
    ws.doc_path("technical_debt").write_text(table("Technical Debt", [r for r in rows if r["category"] in ("technical_debt", "dependency", "performance", "reliability")], "Debt items found by the static analyzer and agents."), encoding="utf-8")
    ws.doc_path("security_assessment").write_text(table("Security Assessment", [r for r in rows if r["category"] == "security"], "Credential values are never shown. 'Potential' items need confirmation."), encoding="utf-8")
    research = ws.store.query("SELECT * FROM research")
    if research:
        extra = ["\n## External research (not repository findings)\n"] + [f"- {r['claim']} (source: {r['source_url']}, {r['version_or_date']}). Applies: {r['applies_to']}" for r in research]
        with ws.doc_path("security_assessment").open("a", encoding="utf-8") as fh:
            fh.write("\n".join(extra) + "\n")


def architecture_diagram(ws: Workspace, summary: dict) -> None:
    st = ws.store
    entries = [r["path"] for r in st.query("SELECT path FROM files WHERE entry=1 AND relevant=1")]
    layers = {r["layer"]: r["n"] for r in st.query("SELECT layer,COUNT(*) n FROM files WHERE relevant=1 GROUP BY layer")}
    out = ["# Architecture Diagram (generated from the index)\n", "```mermaid", "flowchart TB",
           f'  subgraph FE["Frontend: {layers.get("frontend", 0)} files"]', "    FEA[UI components and services]", "  end",
           f'  subgraph BE["Backend: {layers.get("backend", 0)} files"]', f'    BEA["{summary.get("routes", 0)} routes, services, engine"]', "  end"]
    if layers.get("database") or st.one("SELECT COUNT(*) n FROM db_objects")["n"]:
        out += ['  DB[("Database objects in files")]', "  BE --> DB"]
    if layers.get("infra"):
        out += [f'  INF["Infrastructure: {layers["infra"]} files"]', "  INF -.deploys.-> BE"]
    out += [f'  FE -->|"{summary.get("api_calls_matched", 0)} matched API calls"| BE', "```\n",
            "Entry points: " + (", ".join(f"`{e}`" for e in entries) or "none detected"),
            "\n> Generated from deterministic facts. current_architecture.md adds the agent-verified detail."]
    ws.doc_path("architecture_diagram").write_text("\n".join(out) + "\n", encoding="utf-8")


def testing_strategy(ws: Workspace) -> None:
    prot = [e for e in _effective(ws) if e["verdict"] in PROTECTED]
    rules = ws.store.query("SELECT id,title,payload FROM findings WHERE category='business_rule' AND status='active'")
    out = ["# Testing and Regression Strategy\n", "## Principle\n\nCharacterization tests are written and passing BEFORE any migration step touches protected behaviour. A change that alters a protected result is a defect unless a person has approved the new rule.\n",
           f"## Protected behaviour needing characterization tests ({len(prot) + len(rules)})\n", "| Item | Location | Why protected | Required test |", "|---|---|---|---|"]
    for r in rules:
        p = json.loads(r["payload"] or "{}")
        out.append(f"| R-{r['id']} {_cell(p.get('rule', r['title']), 70)} | {_cell(p.get('code_location', ''), 50)} | recorded business rule | inputs from the rule's conditions, assert expected behaviour |")
    for e in prot[:60]:
        out.append(f"| `{e['key'].split('::')[-1]}` | {e['path']}:{e['start']} | {e['verdict']} | golden-master test on current outputs |")
    out += ["\n## Layers\n", "1. Characterization (golden master) tests for protected items above.", "2. Contract tests for every frontend-to-backend call listed in dependency_map.md.",
            "3. Data-migration reconciliation checks (row counts, checksums) for any store change.", "4. Usage logging for obsolete candidates for an agreed period before retirement.",
            "5. Smoke and end-to-end tests of the critical workflows before each phase gate."]
    ws.doc_path("testing_and_regression_strategy").write_text("\n".join(out) + "\n", encoding="utf-8")


def executive_summary(ws: Workspace, summary: dict) -> None:
    st = ws.store
    def n(sql: str) -> int:
        return st.one(sql)["n"]

    active = n("SELECT COUNT(*) n FROM findings WHERE status='active'")
    rules = n("SELECT COUNT(*) n FROM findings WHERE category='business_rule' AND status='active'")
    evidence = n("SELECT COUNT(*) n FROM evidence")
    records = n("SELECT COUNT(*) n FROM records")
    counts = {r["verdict"]: r["n"] for r in st.query("SELECT COALESCE(v.verdict,l.verdict) verdict, COUNT(*) n FROM liveness l LEFT JOIN verdicts v ON v.symbol_key=l.symbol_key AND v.status='active' GROUP BY 1")}
    out = ["# Executive Summary\n", f"- Project: `{ws.project}` (analysed read-only; source never modified)",
           f"- Relevant files: {summary.get('relevant_files')}, symbols: {summary.get('symbols')}, routes: {summary.get('routes')}, frontend calls matched: {summary.get('api_calls_matched')}/{summary.get('api_calls')}",
           f"- Findings: {active} (business rules: {rules}), evidence citations: {evidence}",
           f"- Code classification: {json.dumps(counts)}",
           f"- Operational records: {records}; Git history available: {summary.get('git_history')}",
           "\n## How to read this\n", "- `review_queue.md`: what needs a human decision first.", "- `business_rule_catalogue.md`: rules that must survive modernization.",
           "- `modernization_heatmap.md` and `migration_options.md`: where risk concentrates and the suggested strategy per module.",
           "- `problem_catalogue.md`, `technical_debt.md`, `security_assessment.md`: evidence-backed problems.", "- `migration_roadmap.md`, `testing_and_regression_strategy.md`: the plan.",
           "\n> Old technology is not a reason to delete or rewrite. Retirement of any code requires monitoring and human sign-off."]
    ws.doc_path("executive_summary").write_text("\n".join(out) + "\n", encoding="utf-8")


def generate_all(ws: Workspace, summary: dict) -> list[dict]:
    rule_catalogue(ws)
    dependency_map(ws)
    rows = heatmap(ws)
    review_queue(ws)
    problem_catalogue(ws)
    architecture_diagram(ws, summary)
    testing_strategy(ws)
    executive_summary(ws, summary)
    return rows
