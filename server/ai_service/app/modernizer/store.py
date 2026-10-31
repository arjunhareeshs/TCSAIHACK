"""SQLite evidence store for legacy modernization facts, citations, findings, and tasks."""

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
"""


class Store:
    """Thread-safe SQLite connection manager for evidence.db."""

    def __init__(self, path: Path):
        self.path = Path(path).resolve()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            conn = sqlite3.connect(str(self.path), timeout=30.0, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            self._local.conn = conn
        return self._local.conn

    def _init_db(self) -> None:
        conn = self._conn()
        with conn:
            conn.executescript(SCHEMA)

    def execute(self, sql: str, params: Iterable[Any] = ()) -> sqlite3.Cursor:
        conn = self._conn()
        with conn:
            return conn.execute(sql, tuple(params))

    def executemany(self, sql: str, param_seq: Iterable[Iterable[Any]]) -> sqlite3.Cursor:
        conn = self._conn()
        with conn:
            return conn.executemany(sql, param_seq)

    def query(self, sql: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
        cur = self._conn().cursor()
        cur.execute(sql, tuple(params))
        cols = [col[0] for col in cur.description] if cur.description else []
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def query_one(self, sql: str, params: Iterable[Any] = ()) -> dict[str, Any] | None:
        rows = self.query(sql, params)
        return rows[0] if rows else None

    # Audit logging
    def log_audit(self, agent: str, tool: str, args: dict[str, Any], ms: int, size: int, ok: bool) -> None:
        safe_args = json.dumps(args, default=str)
        self.execute(
            "INSERT INTO audit (ts, agent, tool, args, ms, size, ok) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (time.time(), agent, tool, safe_args, ms, size, 1 if ok else 0),
        )

    # Coverage tracking
    def record_read(self, agent: str, path: str, start: int, end: int) -> None:
        self.execute(
            "INSERT INTO reads (agent, path, start_line, end_line) VALUES (?, ?, ?, ?)",
            (agent, path, start, end),
        )

    def get_read_coverage(self) -> float:
        total = self.query_one("SELECT COUNT(*) as c FROM files WHERE relevant=1")
        if not total or total["c"] == 0:
            return 1.0
        read = self.query_one("SELECT COUNT(DISTINCT path) as c FROM reads")
        read_count = read["c"] if read else 0
        return min(1.0, read_count / total["c"])
