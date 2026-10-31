"""Dynamic agent allocation: partition the repository so every file has one owner."""
import math
from dataclasses import dataclass

from .liveness import HIDDEN, LIVE_UNDOC, NEEDS_HUMAN, OBSOLETE
from .workspace import Workspace

LAYER_AGENT = {"frontend": "A1", "backend": "A2", "database": "A3", "infra": "A4", "config": "A5"}
CODE_FIRST = (".tsx", ".ts", ".jsx", ".js", ".py", ".sql", ".java", ".cs", ".go", ".php", ".rb", ".html")


@dataclass
class Partition:
    agent: str
    index: int
    files: list[str]
    size: int
    label: str

    @property
    def key(self) -> str:
        return f"{self.agent}:{self.index}"


def _pack(items: list[tuple[str, int, str]], max_files: int, max_bytes: int) -> list[list[tuple[str, int, str]]]:
    """items = (path, size, module), already sorted by module so related files stay together."""
    parts, cur, cur_bytes = [], [], 0
    for it in items:
        if cur and (len(cur) >= max_files or cur_bytes + it[1] > max_bytes):
            parts.append(cur)
            cur, cur_bytes = [], 0
        cur.append(it)
        cur_bytes += it[1]
    if cur:
        parts.append(cur)
    return parts


def plan(ws: Workspace) -> list[Partition]:
    s = ws.settings
    st = ws.store
    out: list[Partition] = []
    for layer, agent in LAYER_AGENT.items():
        if agent == "A3":
            rows = st.query("SELECT path, size, module FROM files WHERE relevant=1 AND (layer='database' OR db=1) ORDER BY module, path")
        else:
            rows = st.query("SELECT path, size, module FROM files WHERE relevant=1 AND layer=? AND path NOT LIKE '%.css' ORDER BY module, path", (layer,))
            if agent == "A2":
                db_only = {r["path"] for r in st.query("SELECT path FROM files WHERE layer='database'")}
                rows = [r for r in rows if r["path"] not in db_only]
        if not rows:
            continue
        items = [(r["path"], r["size"], r["module"]) for r in rows]
        parts = _pack(items, s.files_per_agent, s.bytes_per_agent)
        if len(parts) > s.max_partitions_per_agent:  # rate-limit friendly: fewer, larger partitions
            scale = math.ceil(len(parts) / s.max_partitions_per_agent)
            parts = _pack(items, s.files_per_agent * scale, s.bytes_per_agent * scale)
        for i, p in enumerate(parts, 1):
            mods = sorted({m for _, _, m in p})
            out.append(Partition(agent, i, [x[0] for x in p], sum(x[1] for x in p), ", ".join(mods[:4])))
    if st.one("SELECT COUNT(*) n FROM records")["n"]:
        out.append(Partition("A6", 1, [], 0, "incidents and tickets"))
    return out


def rule_candidates(ws: Workspace) -> list[list[dict]]:
    s = ws.settings
    rows = ws.store.query(
        "SELECT s.key, s.path, s.start, s.end, s.business, f.module FROM symbols s JOIN files f ON f.path=s.path "
        "WHERE s.business>=3 AND f.layer IN ('backend','frontend','database') AND s.kind IN ('function','method') "
        "ORDER BY s.business DESC, s.path LIMIT ?", (s.rule_candidates_per_task * s.max_partitions_per_agent,))
    rows.sort(key=lambda r: (r["module"], -r["business"]))
    return [rows[i:i + s.rule_candidates_per_task] for i in range(0, len(rows), s.rule_candidates_per_task)]


def adjudication_queue(ws: Workspace) -> list[list[dict]]:
    s = ws.settings
    order = {HIDDEN: 0, NEEDS_HUMAN: 1, OBSOLETE: 2, LIVE_UNDOC: 3}
    rows = ws.store.query(
        "SELECT l.symbol_key key, l.verdict, s.path, s.start, s.end, s.business FROM liveness l JOIN symbols s ON s.key=l.symbol_key "
        "JOIN files f ON f.path=s.path WHERE l.verdict IN (?,?,?) AND f.layer IN ('backend','frontend','database') "
        "AND s.kind IN ('function','method','class') AND s.key NOT IN (SELECT symbol_key FROM verdicts WHERE status='active')",
        (HIDDEN, NEEDS_HUMAN, OBSOLETE))
    rows.sort(key=lambda r: (order.get(r["verdict"], 9), -r["business"]))
    rows = rows[: s.adjudicate_max_total]
    return [rows[i:i + s.adjudicate_per_task] for i in range(0, len(rows), s.adjudicate_per_task)]
