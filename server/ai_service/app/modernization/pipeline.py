"""Deterministic fact pipeline: scan -> index -> link -> git -> operational records -> liveness -> static checks."""
import json
import re
from collections import Counter

from . import liveness
from .indexer import FileIndex, index_file
from .linker import (TOKEN, find_cycles, link_records, link_routes, load_records, mine_git, resolve_imports)
from .scanner import scan
from .util import has_secret, is_env_file, read_text
from .workspace import Workspace

STATIC_AGENT = "static-analyzer"
QUOTED = re.compile(r"""["']([\w.:/\-]+)["']""")
COMMENT_PREFIX = {
    "python": ("#",), "shell": ("#",), "yaml": ("#",), "ruby": ("#",),
    "sql": ("--",),
}
C_STYLE = ("//", "/*", "* ", "*/")  # a bare "*" is NOT a comment: Python uses it for unpacking


def _insert_index(ws: Workspace, path: str, idx: FileIndex, used_keys: set[str]) -> None:
    st = ws.store
    rows = []
    for s in idx.symbols:
        key = f"{path}::{s.qualname}"
        if key in used_keys:
            key = f"{key}#{s.start}"
        used_keys.add(key)
        rows.append((key, path, s.name, s.qualname, s.kind, s.start, s.end, s.decorators, s.sha, s.business, s.data_effect))
    st.many("INSERT INTO symbols(key,path,name,qualname,kind,start,end,decorators,sha,business,data_effect) VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows)
    st.many("INSERT INTO routes(method,pattern,path,line,handler,local_prefix) VALUES (?,?,?,?,?,?)",
            [(r.method, r.pattern, path, r.line, r.handler, r.local_prefix) for r in idx.routes])
    st.many("INSERT INTO api_calls(method,pattern,path,line,raw) VALUES (?,?,?,?,?)",
            [(c.method, c.pattern, path, c.line, c.raw) for c in idx.calls])
    st.many("INSERT INTO imports(path,module,line,side_effect) VALUES (?,?,?,?)",
            [(path, i.module, i.line, i.side_effect) for i in idx.imports])
    st.many("INSERT INTO markers(path,line,kind,detail) VALUES (?,?,?,?)", [(path, m.line, m.kind, m.detail) for m in idx.markers])
    st.many("INSERT INTO db_objects VALUES (?,?,?,?,?)", [(d.name, d.kind, path, d.line, d.detail) for d in idx.db_objects])
    if idx.db_objects:
        st.run("UPDATE files SET db=1 WHERE path=?", (path,))


def _scan_mentions(ws: Workspace, texts: dict[str, str], layers: dict[str, str], langs: dict[str, str]) -> None:
    names = {r["name"] for r in ws.store.query("SELECT DISTINCT name FROM symbols") if len(r["name"]) >= 3}
    rows = []
    for path, text in texts.items():
        code_layer = layers.get(path) in ("frontend", "backend", "database", "test")
        prefixes = COMMENT_PREFIX.get(langs.get(path, ""), C_STYLE)
        for no, line in enumerate(text.splitlines(), 1):
            if code_layer and line.lstrip().startswith(prefixes):
                continue
            strtoks: set[str] = set()
            if "'" in line or '"' in line:
                for q in QUOTED.findall(line):
                    strtoks.update(re.split(r"[.:/\-]", q))
            seen = set()
            for m in TOKEN.finditer(line):
                t = m.group(0)
                if t in names and t not in seen:
                    seen.add(t)
                    rows.append((t, path, no, int(t in strtoks)))
    ws.store.many("INSERT INTO mentions VALUES (?,?,?,?)", rows)


def build_facts(ws: Workspace) -> dict:
    st = ws.store
    st.reset_facts()
    files = scan(ws.root)
    st.many("INSERT INTO files VALUES (?,?,?,?,?,?,?,?,?,?)",
            [(f.path, f.layer, f.lang, f.size, f.lines, f.generated, f.entry, f.relevant, f.module, f.db) for f in files])
    layers = {f.path: f.layer for f in files}
    langs = {f.path: f.lang for f in files}
    texts: dict[str, str] = {}
    includes: dict[str, list[tuple[str, str]]] = {}
    used_keys: set[str] = set()
    for f in files:
        if f.layer == "asset" or f.generated:
            continue
        text = read_text(ws.root / f.path)
        if text is None:
            continue
        texts[f.path] = text
        if f.layer in ("docs",):
            continue
        idx = index_file(text, f.lang)
        if idx.router_includes:
            includes[f.path] = idx.router_includes
        _insert_index(ws, f.path, idx, used_keys)
    _scan_mentions(ws, texts, layers, langs)
    link_routes(st, includes)
    resolve_imports(st)
    git_ok = mine_git(st, ws.root)
    n_records = load_records(st, ws.analysis_dir / "inputs")
    n_links = link_records(st)
    counts = liveness.compute(st)
    stale = liveness.reopen_stale(st)
    n_static = run_static_checks(ws, texts)
    return {
        "files": len(files), "relevant_files": sum(f.relevant for f in files),
        "symbols": st.one("SELECT COUNT(*) n FROM symbols")["n"],
        "routes": st.one("SELECT COUNT(*) n FROM routes")["n"],
        "api_calls": st.one("SELECT COUNT(*) n FROM api_calls")["n"],
        "api_calls_matched": st.one("SELECT COUNT(*) n FROM api_calls WHERE route_id IS NOT NULL")["n"],
        "git_history": git_ok, "records": n_records, "record_links": n_links,
        "liveness": counts, "verdicts_reopened": stale, "static_findings": n_static,
    }


def _first_import_line(ws: Workspace, src: str, dst: str) -> int | None:
    r = ws.store.one("SELECT line FROM imports WHERE path=? AND target=? ORDER BY line LIMIT 1", (src, dst))
    return r["line"] if r else None


def run_static_checks(ws: Workspace, texts: dict[str, str]) -> int:
    st = ws.store
    st.run("DELETE FROM finding_evidence WHERE finding_id IN (SELECT id FROM findings WHERE agent=?)", (STATIC_AGENT,))
    st.run("DELETE FROM findings WHERE agent=?", (STATIC_AGENT,))
    layers = {r["path"]: r["layer"] for r in st.query("SELECT path, layer FROM files")}
    n = 0

    def add(*a, **k):
        nonlocal n
        try:
            ws.add_finding(STATIC_AGENT, *a, **k)
            n += 1
        except ValueError:
            pass

    # 1. credential-like literals (values are never stored)
    for path, text in texts.items():
        if layers.get(path) not in ("frontend", "backend", "database", "infra", "config") or is_env_file(path):
            continue
        hits = [i for i, ln in enumerate(text.splitlines(), 1) if has_secret(ln) and not ln.lstrip().startswith(("#", "//"))]
        if hits:
            ev = [ws.cite(path, h, h, "credential-like literal (value not stored)", STATIC_AGENT) for h in hits[:5]]
            add("security", f"Credential-like literal in {path}", f"{len(hits)} line(s) look like hard-coded credentials: lines {hits[:10]}. Values are masked.",
                "Verified", "high", ev)
    envs = [p for p in texts if is_env_file(p) and not p.lower().endswith((".example", ".sample"))]
    for p in envs:
        ev = [ws.cite(p, 1, 1, "env file present in project tree", STATIC_AGENT)]
        add("security", f"Environment file present in the project tree: {p}",
            "A real .env-style file exists in the source tree. Variable names only are shown to agents. Confirm it is not committed to version control.",
            "Potential", "medium", ev, open_question="Is this file tracked by the project's Git repository?")

    # 2. circular imports
    for cyc in find_cycles(st)[:10]:
        ev = []
        for a, b in zip(cyc, cyc[1:]):
            ln = _first_import_line(ws, a, b)
            if ln:
                ev.append(ws.cite(a, ln, ln, f"imports {b}", STATIC_AGENT))
        add("technical_debt", "Circular import: " + " -> ".join(cyc), "Import cycle found by resolving project-internal imports. Cycles make modules hard to extract.",
            "Inferred", "medium", ev)

    # 3. syntax errors, unpinned dependencies, very large functions
    for m in st.query("SELECT path, line, detail FROM markers WHERE kind='syntax_error'"):
        ev = [ws.cite(m["path"], min(m["line"], max(1, len(texts[m["path"]].splitlines()))), min(m["line"], max(1, len(texts[m["path"]].splitlines()))), "syntax error", STATIC_AGENT)]
        add("technical_debt", f"Python syntax error in {m['path']}", f"The parser failed: {m['detail']}. Possibly a different Python version.", "Verified", "medium", ev)
    for path, text in texts.items():
        if path.endswith("requirements.txt"):
            lines = text.splitlines()
            loose = [i for i, ln in enumerate(lines, 1) if ln.strip() and not ln.startswith(("#", "-")) and "==" not in ln]
            if loose:
                ev = [ws.cite(path, loose[0], loose[0], "unpinned requirement", STATIC_AGENT)]
                add("dependency", f"{len(loose)} unpinned dependencies in {path}",
                    f"Requirements without an exact version (first at line {loose[0]}) make builds non-reproducible and block vulnerability matching.", "Verified", "medium", ev)
    big = st.query("SELECT key, path, start, end FROM symbols WHERE kind IN ('function','method') AND (end-start)>=120 ORDER BY (end-start) DESC LIMIT 5")
    if big:
        ev = [ws.cite(b["path"], b["start"], min(b["end"], b["start"] + 199), "very large function", STATIC_AGENT) for b in big]
        add("technical_debt", f"{len(big)} very large function(s) (120+ lines)", "; ".join(f"{b['key']} ({b['end'] - b['start'] + 1} lines)" for b in big),
            "Verified", "low", ev)

    # 4. frontend calls with no matching backend route
    for c in st.query("SELECT path, line, method, pattern FROM api_calls WHERE route_id IS NULL LIMIT 20"):
        ev = [ws.cite(c["path"], c["line"], c["line"], "frontend call without matched route", STATIC_AGENT)]
        add("gap", f"Frontend call {c['method']} {c['pattern']} has no matching backend route", "No route in the indexed backend matches this call. It may target an external service or a route the indexer cannot see.",
            "Potential", "medium", ev, open_question="Does this call target an external API, or is a backend route missing or registered dynamically?")
    return n


def write_baseline_docs(ws: Workspace) -> None:
    st = ws.store
    by_layer = Counter(r["layer"] for r in st.query("SELECT layer FROM files WHERE generated=0"))
    langs = Counter(r["lang"] for r in st.query("SELECT lang FROM files WHERE layer IN ('frontend','backend','database','infra','config')"))
    entries = [r["path"] for r in st.query("SELECT path FROM files WHERE entry=1")]
    git = st.one("SELECT COUNT(*) n FROM git_stats")["n"]
    ctx = [f"- Project folder (read-only, never modified): `{ws.root}`",
           f"- Files by layer: {dict(by_layer)}", f"- Languages in relevant layers: {dict(langs)}",
           f"- Entry points: {entries}", f"- Git history available for {git} files",
           f"- Operational records loaded: {st.one('SELECT COUNT(*) n FROM records')['n']}"]
    ws.write_section("project_context", "Inventory", "\n".join(ctx))
    routes = st.query("SELECT method, full_pattern, path, line, handler FROM routes ORDER BY path, line")
    calls = st.query("SELECT c.method, c.pattern, c.path, c.line, r.full_pattern, r.path rp FROM api_calls c LEFT JOIN routes r ON r.id=c.route_id ORDER BY c.path, c.line")
    comp = ["### Backend routes (indexed)", "", "| Method | Route | Handler | Location |", "|---|---|---|---|"]
    comp += [f"| {r['method']} | `{r['full_pattern']}` | {r['handler'] or '-'} | {r['path']}:{r['line']} |" for r in routes]
    comp += ["", "### Frontend API calls", "", "| Call | Location | Matched backend route |", "|---|---|---|"]
    comp += [f"| {c['method']} `{c['pattern']}` | {c['path']}:{c['line']} | {('`' + c['full_pattern'] + '` (' + c['rp'] + ')') if c['full_pattern'] else '**no match**'} |" for c in calls]
    dbo = st.query("SELECT name, kind, path, line FROM db_objects")
    comp += ["", "### Database objects found in files", ""] + [f"- {d['kind']} `{d['name']}` ({d['path']}:{d['line']})" for d in dbo] or ["_none_"]
    ws.write_section("discovered_components", "Indexed by the deterministic layer", "\n".join(comp))
    ws.write_section("investigation_progress", "Status", "Facts built. Agent investigation not started yet.")
