"""SQLite evidence store.

Holds the deterministic facts, the agents' evidence, findings, rules and verdicts,
task state for resumable runs, memory notes and the tool audit log.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Iterable

SCHEMA = """
CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY, language TEXT, layer TEXT, size INTEGER, lines INTEGER,
    sha TEXT, generated INTEGER, binary INTEGER, relevant INTEGER, partition TEXT
);
CREATE TABLE IF NOT EXISTS symbols (
    id TEXT PRIMARY KEY, path TEXT, name TEXT, qualname TEXT, kind TEXT,
    start_line INTEGER, end_line INTEGER, exported INTEGER, decorators TEXT,
    branches INTEGER, business_shape INTEGER, doc TEXT
);
CREATE INDEX IF NOT EXISTS ix_symbols_name ON symbols(name);
CREATE INDEX IF NOT EXISTS ix_symbols_path ON symbols(path);
CREATE TABLE IF NOT EXISTS edges (
    src TEXT, dst TEXT, kind TEXT, path TEXT, line INTEGER, detail TEXT
);
CREATE INDEX IF NOT EXISTS ix_edges_src ON edges(src);
CREATE INDEX IF NOT EXISTS ix_edges_dst ON edges(dst);
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY, method TEXT, path TEXT, handler TEXT, file TEXT, line INTEGER, framework TEXT
);
CREATE TABLE IF NOT EXISTS api_calls (
    id TEXT PRIMARY KEY, method TEXT, url TEXT, file TEXT, line INTEGER, matched_route TEXT
);
CREATE TABLE IF NOT EXISTS db_objects (
    id TEXT PRIMARY KEY, name TEXT, kind TEXT, file TEXT, line INTEGER, definition TEXT
);
CREATE TABLE IF NOT EXISTS markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, line INTEGER, kind TEXT, detail TEXT
);
CREATE TABLE IF NOT EXISTS manifests (
    path TEXT, ecosystem TEXT, package TEXT, version TEXT, dev INTEGER
);
CREATE TABLE IF NOT EXISTS env_vars (
    name TEXT, path TEXT, line INTEGER, documented INTEGER
);
CREATE TABLE IF NOT EXISTS git_stats (
    path TEXT PRIMARY KEY, commits INTEGER, fix_commits INTEGER, authors INTEGER, last_date TEXT
);
CREATE TABLE IF NOT EXISTS context_docs (
    id TEXT PRIMARY KEY, kind TEXT, title TEXT, body TEXT, source TEXT, sample INTEGER
);
CREATE TABLE IF NOT EXISTS context_links (
    doc_id TEXT, target TEXT, target_kind TEXT
);
CREATE TABLE IF NOT EXISTS liveness (
    symbol_id TEXT PRIMARY KEY, signals TEXT, auto_verdict TEXT, reasons TEXT
);
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY, kind TEXT, path TEXT, start_line INTEGER, end_line INTEGER,
    sha TEXT, note TEXT, agent TEXT, created REAL
);
CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY, agent TEXT, category TEXT, layer TEXT, title TEXT, description TEXT,
    confidence TEXT, severity TEXT, likelihood TEXT, evidence_ids TEXT, open_question TEXT,
    recommendation TEXT, status TEXT, created REAL
);
CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY, agent TEXT, data TEXT, evidence_ids TEXT, confidence TEXT, status TEXT, created REAL
);
CREATE TABLE IF NOT EXISTS verdicts (
    id TEXT PRIMARY KEY, symbol_id TEXT, verdict TEXT, rationale TEXT, evidence_ids TEXT,
    checks TEXT, agent TEXT, status TEXT, created REAL
);
CREATE TABLE IF NOT EXISTS research (
    id TEXT PRIMARY KEY, agent TEXT, claim TEXT, source_url TEXT, version_or_date TEXT,
    applies_to TEXT, created REAL
);
CREATE TABLE IF NOT EXISTS tasks (
    key TEXT PRIMARY KEY, agent TEXT, phase TEXT, scope TEXT, status TEXT, attempts INTEGER,
    error TEXT, output TEXT, parent TEXT, round INTEGER, started REAL, finished REAL
);
CREATE TABLE IF NOT EXISTS reads (
    agent TEXT, path TEXT, start_line INTEGER, end_line INTEGER
);
CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT, note TEXT, evidence_ids TEXT, agent TEXT, created REAL
);
CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, agent TEXT, tool TEXT, args TEXT,
    ms INTEGER, size INTEGER, ok INTEGER
);
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY, item_kind TEXT, item_id TEXT, question TEXT, decision TEXT,
    note TEXT, decided_by TEXT, decided_at REAL
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY, value TEXT
);
"""

FACT_TABLES = (
    "files", "symbols", "edges", "routes", "api_calls", "db_objects", "markers",
    "manifests", "env_vars", "git_stats", "context_links", "liveness",
)


class Store:
    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.path = db_path
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=30)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    # --- basic access --------------------------------------------------------
    def execute(self, sql: str, params: Iterable[Any] = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self._conn.execute(sql, tuple(params))
            self._conn.commit()
            return cur

    def executemany(self, sql: str, rows: Iterable[Iterable[Any]]) -> None:
        with self._lock:
            self._conn.executemany(sql, [tuple(r) for r in rows])
            self._conn.commit()

    def query(self, sql: str, params: Iterable[Any] = ()) -> list[dict]:
        with self._lock:
            return [dict(r) for r in self._conn.execute(sql, tuple(params)).fetchall()]

    def one(self, sql: str, params: Iterable[Any] = ()) -> dict | None:
        rows = self.query(sql, params)
        return rows[0] if rows else None

    def scalar(self, sql: str, params: Iterable[Any] = ()) -> Any:
        row = self.one(sql, params)
        return next(iter(row.values())) if row else None

    def clear_facts(self) -> None:
        with self._lock:
            for table in FACT_TABLES:
                self._conn.execute(f"DELETE FROM {table}")
            self._conn.execute("DELETE FROM context_docs WHERE source != 'manual'")
            self._conn.commit()

    # --- ids -------------------------------------------------------------------
    def next_id(self, prefix: str, table: str) -> str:
        with self._lock:
            n = self._conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            while True:
                n += 1
                candidate = f"{prefix}{n}"
                if not self._conn.execute(f"SELECT 1 FROM {table} WHERE id=?", (candidate,)).fetchone():
                    return candidate

    # --- meta ------------------------------------------------------------------
    def set_meta(self, key: str, value: Any) -> None:
        self.execute("INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)", (key, json.dumps(value)))

    def get_meta(self, key: str, default: Any = None) -> Any:
        row = self.one("SELECT value FROM meta WHERE key=?", (key,))
        return json.loads(row["value"]) if row else default

    # --- audit -----------------------------------------------------------------
    def audit(self, agent: str, tool: str, args: dict, ms: int, size: int, ok: bool) -> None:
        self.execute(
            "INSERT INTO audit(ts, agent, tool, args, ms, size, ok) VALUES (?,?,?,?,?,?,?)",
            (time.time(), agent, tool, json.dumps(args, default=str)[:4000], ms, size, int(ok)),
        )

    def agent_calls(self, agent: str, tool: str) -> list[dict]:
        rows = self.query("SELECT args FROM audit WHERE agent=? AND tool=? AND ok=1", (agent, tool))
        return [json.loads(r["args"]) for r in rows]

    def close(self) -> None:
        with self._lock:
            self._conn.close()


def dumps(value: Any) -> str:
    return json.dumps(value, default=str)


def loads(value: str | None, default: Any = None) -> Any:
    if value in (None, ""):
        return default
    return json.loads(value)
