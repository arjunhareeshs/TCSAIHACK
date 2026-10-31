"""SQLite evidence store: index facts, citations, findings, verdicts and task state."""
import sqlite3
import threading
from pathlib import Path
from typing import Iterable

SCHEMA = """
CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, layer TEXT, lang TEXT, size INT, lines INT,
  generated INT, entry INT, relevant INT, module TEXT, db INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS symbols(id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, path TEXT, name TEXT,
  qualname TEXT, kind TEXT, start INT, end INT, decorators TEXT, sha TEXT, business INT, data_effect INT);
CREATE INDEX IF NOT EXISTS symbols_name ON symbols(name);
CREATE INDEX IF NOT EXISTS symbols_path ON symbols(path);
CREATE TABLE IF NOT EXISTS mentions(name TEXT, path TEXT, line INT, in_string INT);
CREATE INDEX IF NOT EXISTS mentions_name ON mentions(name);
CREATE TABLE IF NOT EXISTS routes(id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT, pattern TEXT, path TEXT,
  line INT, handler TEXT, local_prefix TEXT, full_pattern TEXT);
CREATE TABLE IF NOT EXISTS api_calls(id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT, pattern TEXT, path TEXT,
  line INT, raw TEXT, route_id INT);
CREATE TABLE IF NOT EXISTS imports(path TEXT, module TEXT, line INT, side_effect INT, target TEXT);
CREATE TABLE IF NOT EXISTS markers(id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, line INT, kind TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS db_objects(name TEXT, kind TEXT, path TEXT, line INT, detail TEXT);
CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, kind TEXT, title TEXT, body TEXT, source TEXT);
CREATE TABLE IF NOT EXISTS record_links(record_id TEXT, path TEXT, symbol_key TEXT);
CREATE TABLE IF NOT EXISTS git_stats(path TEXT PRIMARY KEY, commits INT, fix_commits INT, last TEXT, fix_subjects TEXT);
CREATE TABLE IF NOT EXISTS liveness(symbol_key TEXT PRIMARY KEY, verdict TEXT, signals TEXT);
CREATE TABLE IF NOT EXISTS file_reads(path TEXT, agent TEXT, start INT, end INT);
CREATE TABLE IF NOT EXISTS evidence(id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, start INT, end INT,
  sha TEXT, note TEXT, agent TEXT);
CREATE TABLE IF NOT EXISTS findings(id INTEGER PRIMARY KEY AUTOINCREMENT, agent TEXT, category TEXT, title TEXT,
  description TEXT, confidence TEXT, severity TEXT, open_question TEXT, payload TEXT,
  status TEXT DEFAULT 'active', created REAL DEFAULT (strftime('%s','now')));
CREATE TABLE IF NOT EXISTS finding_evidence(finding_id INT, evidence_id INT);
CREATE TABLE IF NOT EXISTS verdicts(symbol_key TEXT PRIMARY KEY, sha TEXT, verdict TEXT, rationale TEXT,
  agent TEXT, checks TEXT, evidence TEXT, status TEXT DEFAULT 'active');
CREATE TABLE IF NOT EXISTS tasks(key TEXT PRIMARY KEY, agent TEXT, scope TEXT, status TEXT, attempts INT DEFAULT 0,
  error TEXT, output TEXT, started REAL, finished REAL, kind TEXT DEFAULT 'planned');
CREATE TABLE IF NOT EXISTS research(id INTEGER PRIMARY KEY AUTOINCREMENT, claim TEXT, source_url TEXT,
  version_or_date TEXT, applies_to TEXT, agent TEXT);
CREATE TABLE IF NOT EXISTS tool_audit(id INTEGER PRIMARY KEY AUTOINCREMENT, agent TEXT, tool TEXT, args TEXT,
  ms INT, size INT, ok INT, ts REAL DEFAULT (strftime('%s','now')));
"""

FACT_TABLES = (
    "files", "symbols", "mentions", "routes", "api_calls", "imports", "markers",
    "db_objects", "records", "record_links", "git_stats", "liveness",
)


class Store:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self._db.row_factory = sqlite3.Row
        self._lock = threading.RLock()
        with self._lock:
            self._db.execute("PRAGMA journal_mode=WAL")
            self._db.executescript(SCHEMA)

    def query(self, sql: str, params: Iterable = ()) -> list[dict]:
        with self._lock:
            return [dict(r) for r in self._db.execute(sql, tuple(params)).fetchall()]

    def one(self, sql: str, params: Iterable = ()) -> dict | None:
        rows = self.query(sql, params)
        return rows[0] if rows else None

    def run(self, sql: str, params: Iterable = ()) -> int:
        with self._lock:
            return self._db.execute(sql, tuple(params)).lastrowid

    def many(self, sql: str, rows: list[tuple]) -> None:
        if not rows:
            return
        with self._lock:
            self._db.execute("BEGIN")
            try:
                self._db.executemany(sql, rows)
                self._db.execute("COMMIT")
            except Exception:
                self._db.execute("ROLLBACK")
                raise

    def reset_facts(self) -> None:
        with self._lock:
            for t in FACT_TABLES:
                self._db.execute(f"DELETE FROM {t}")

    def close(self) -> None:
        with self._lock:
            self._db.close()
