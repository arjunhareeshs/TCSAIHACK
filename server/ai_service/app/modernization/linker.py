"""Connection linker, operational-evidence linker and Git miner. No LLM."""
import json
import re
import subprocess
from pathlib import Path

from .store import Store

FIX_RE = re.compile(r"\b(fix(?:es|ed)?|bug|hotfix|patch|incident|issue|revert|regression|outage)\b", re.I)
TOKEN = re.compile(r"[A-Za-z_$][\w$]*")


def _segments(p: str) -> list[str]:
    return [s for s in p.strip("/").split("/") if s]


def _seg_match(call_seg: str, route_seg: str) -> bool:
    if call_seg == "{}" or (route_seg.startswith("{") and route_seg.endswith("}")) or route_seg.startswith(":"):
        return True
    return call_seg == route_seg


def link_routes(store: Store, includes: dict[str, list[tuple[str, str]]]) -> None:
    """Resolve full route patterns (include_router prefixes) and match frontend calls to routes."""
    prefix_by_module: dict[str, str] = {}
    for _path, incs in includes.items():
        for alias, prefix in incs:
            if alias:
                prefix_by_module[alias] = prefix
    router_prefix = {m["path"]: m["detail"] for m in store.query("SELECT path, detail FROM markers WHERE kind='router_prefix'")}
    for r in store.query("SELECT id, path, pattern FROM routes"):
        base = Path(r["path"]).stem
        full = (prefix_by_module.get(base, "") + router_prefix.get(r["path"], "") + r["pattern"]).replace("//", "/")
        store.run("UPDATE routes SET full_pattern=? WHERE id=?", (full or "/", r["id"]))
    routes = store.query("SELECT id, method, full_pattern FROM routes")
    for c in store.query("SELECT id, method, pattern FROM api_calls"):
        cs = _segments(c["pattern"])
        best = None
        for r in routes:
            rs = _segments(r["full_pattern"])
            n = min(len(cs), len(rs))
            if n == 0 or r["method"] not in ("ANY", c["method"]):
                continue
            # the shorter path must match the tail of the longer one: a base URL such as /api may live
            # in a constant the indexer cannot see, or in a reverse proxy
            if all(_seg_match(a, b) for a, b in zip(cs[len(cs) - n:], rs[len(rs) - n:])):
                score = (n, -abs(len(cs) - len(rs)))
                if best is None or score > best[0]:
                    best = (score, r["id"])
        if best:
            store.run("UPDATE api_calls SET route_id=? WHERE id=?", (best[1], c["id"]))


def source_roots(py_paths: list[str], entry_paths: list[str]) -> list[str]:
    """Directories Python would put on sys.path: parents of top-level packages, entry-script folders, project root."""
    def parent(p: str) -> str:
        q = Path(p).parent.as_posix()
        return "" if q == "." else q

    pkg_dirs = {parent(p) for p in py_paths if p.endswith("__init__.py")}
    roots = {""}
    for d in pkg_dirs:
        top = d
        while parent(top) in pkg_dirs:
            top = parent(top)
        roots.add(parent(top))
    roots.update(parent(e) for e in entry_paths if e.endswith(".py"))
    return sorted(roots)


def build_module_map(py_paths: list[str], roots: list[str]) -> dict[str, str]:
    mods: dict[str, str] = {}
    for root in roots:
        prefix = f"{root}/" if root else ""
        for p in py_paths:
            if not p.startswith(prefix):
                continue
            mod = p[len(prefix):-3].replace("/", ".")
            if mod.endswith(".__init__"):
                mod = mod[: -len(".__init__")]
            mods.setdefault(mod, p)
    return mods


def resolve_import(module: str, from_path: str, mods: dict[str, str], all_paths: set[str]) -> str | None:
    """Map an import string to a project file, or None for external or standard-library modules."""
    if module.startswith("."):
        up = len(module) - len(module.lstrip("."))
        base = Path(from_path).parent
        for _ in range(up - 1):
            base = base.parent
        rest = module.lstrip(".").replace(".", "/")
        stem = (base / rest).as_posix() if rest else base.as_posix()
        for cand in (f"{stem}.py", f"{stem}/__init__.py"):
            if cand in all_paths:
                return cand
        return None
    return mods.get(module)


def resolve_js_import(module: str, from_path: str, all_paths: set[str]) -> str | None:
    if not module.startswith("."):
        return None
    base = (Path(from_path).parent / module).as_posix()
    parts: list[str] = []
    for seg in base.split("/"):
        if seg == "..":
            if parts:
                parts.pop()
        elif seg != ".":
            parts.append(seg)
    norm = "/".join(parts)
    for ext in ("", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"):
        if norm + ext in all_paths:
            return norm + ext
    return None


def resolve_imports(store: Store) -> None:
    files = store.query("SELECT path, lang, entry FROM files")
    all_paths = {f["path"] for f in files}
    py_paths = sorted(f["path"] for f in files if f["path"].endswith(".py"))
    mods = build_module_map(py_paths, source_roots(py_paths, [f["path"] for f in files if f["entry"]]))
    lang = {f["path"]: f["lang"] for f in files}
    rows = []
    for imp in store.query("SELECT rowid, path, module FROM imports"):
        if lang.get(imp["path"]) == "python":
            tgt = resolve_import(imp["module"], imp["path"], mods, all_paths)
        else:
            tgt = resolve_js_import(imp["module"], imp["path"], all_paths)
        if tgt and tgt != imp["path"]:
            rows.append((tgt, imp["rowid"]))
    if rows:
        store.many("UPDATE imports SET target=? WHERE rowid=?", rows)


def find_cycles(store: Store) -> list[list[str]]:
    graph: dict[str, set[str]] = {}
    for r in store.query("SELECT DISTINCT path, target FROM imports WHERE target IS NOT NULL"):
        graph.setdefault(r["path"], set()).add(r["target"])
    cycles, seen = [], set()
    state: dict[str, int] = {}

    def dfs(n: str, stack: list[str]):
        state[n] = 1
        stack.append(n)
        for m in sorted(graph.get(n, ())):
            if state.get(m) == 1:
                cyc = stack[stack.index(m):] + [m]
                key = frozenset(cyc)
                if key not in seen:
                    seen.add(key)
                    cycles.append(cyc)
            elif state.get(m) is None:
                dfs(m, stack)
        stack.pop()
        state[n] = 2

    for n in sorted(graph):
        if state.get(n) is None:
            dfs(n, [])
    return cycles


def mine_git(store: Store, project_root: Path) -> bool:
    """Per-file commit counts from the project's OWN repository. Returns False if there is none."""
    if not (project_root / ".git").exists():
        return False
    try:
        out = subprocess.run(
            ["git", "-C", str(project_root), "log", "--name-only", "--no-renames", "--pretty=format:@@%H|%ad|%s", "--date=short", "-n", "2000"],
            capture_output=True, text=True, timeout=60, encoding="utf-8", errors="replace",
        ).stdout
    except (OSError, subprocess.TimeoutExpired):
        return False
    stats: dict[str, dict] = {}
    subject, date = "", ""
    for line in out.splitlines():
        if line.startswith("@@"):
            _, date, subject = line[2:].split("|", 2)
        elif line.strip():
            s = stats.setdefault(line.strip(), {"commits": 0, "fix": 0, "last": date, "subjects": []})
            s["commits"] += 1
            if FIX_RE.search(subject):
                s["fix"] += 1
                s["subjects"].append(subject[:80])
    known = {f["path"] for f in store.query("SELECT path FROM files")}
    store.many(
        "INSERT OR REPLACE INTO git_stats VALUES (?,?,?,?,?)",
        [(p, s["commits"], s["fix"], s["last"], json.dumps(s["subjects"][:5])) for p, s in stats.items() if p in known],
    )
    return True


def load_records(store: Store, inputs_dir: Path) -> int:
    """Load incidents, tickets and notes from <analysis>/inputs. JSON list, or one .md/.txt file per record."""
    if not inputs_dir.exists():
        return 0
    rows = []
    for f in sorted(inputs_dir.iterdir()):
        if f.suffix.lower() == ".json":
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            for i, r in enumerate(data.get("records", data) if isinstance(data, dict) else data):
                if isinstance(r, dict):
                    rows.append((str(r.get("id", f"{f.stem}-{i}")), str(r.get("kind", "ticket")), str(r.get("title", ""))[:200],
                                 str(r.get("body", r.get("description", ""))), f.name))
        elif f.suffix.lower() in (".md", ".txt"):
            kind = f.stem.split("-")[0].lower()
            kind = kind if kind in ("incident", "ticket", "change", "runbook") else "doc"
            body = f.read_text(encoding="utf-8", errors="replace")
            rows.append((f.stem, kind, body.splitlines()[0][:200] if body else f.stem, body, f.name))
    store.many("INSERT OR REPLACE INTO records VALUES (?,?,?,?,?)", rows)
    return len(rows)


def link_records(store: Store) -> int:
    """Link each record to the files and symbols its text mentions."""
    files = store.query("SELECT path FROM files WHERE relevant=1")
    symbols = [s for s in store.query("SELECT key, path, name FROM symbols") if len(s["name"]) >= 6]
    links = []
    for r in store.query("SELECT id, body, title FROM records"):
        text = f"{r['title']}\n{r['body']}"
        low = text.lower()
        toks = set(TOKEN.findall(text))
        for f in files:
            base = f["path"].rsplit("/", 1)[-1].lower()
            if f["path"].lower() in low or (len(base) >= 5 and base in low):
                links.append((r["id"], f["path"], None))
        for s in symbols:
            if s["name"] in toks:
                links.append((r["id"], s["path"], s["key"]))
    store.many("INSERT INTO record_links VALUES (?,?,?)", list(dict.fromkeys(links)))
    return len(links)
