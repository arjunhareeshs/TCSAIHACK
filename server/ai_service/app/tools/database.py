"""Read-only SQLite access for interactive agents."""

from __future__ import annotations

import os
import re
import sqlite3
from contextlib import closing
from pathlib import Path

from crewai.tools import tool
from langfuse import observe
from app.core.observability import record_tool_output, update_current_span

MAX_ROWS = 100
MAX_SQL_CHARS = 8_000
READ_ONLY_SQL = re.compile(r"^\s*(select|with|explain|pragma)\b", re.IGNORECASE)


def _database_path(database_path: str | None) -> Path:
    configured = database_path or os.getenv("AI_SERVICE_DB_PATH")
    if not configured:
        raise ValueError("Set AI_SERVICE_DB_PATH or provide database_path")
    path = Path(configured).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Database file does not exist: {path}")
    return path


def _validate_query(sql: str) -> str:
    sql = sql.strip()
    if not sql:
        raise ValueError("sql must not be empty")
    if len(sql) > MAX_SQL_CHARS:
        raise ValueError(f"sql must be at most {MAX_SQL_CHARS} characters")
    if not READ_ONLY_SQL.match(sql):
        raise ValueError("Only SELECT, WITH, EXPLAIN, and PRAGMA queries are allowed")
    without_trailing_semicolon = sql.rstrip(";").rstrip()
    if ";" in without_trailing_semicolon:
        raise ValueError("Only one SQL statement is allowed")
    return without_trailing_semicolon


@tool("fetch_database_rows")
@observe(name="fetch-database-rows", as_type="tool", capture_input=False, capture_output=False)
def fetch_database_rows(
    sql: str,
    database_path: str | None = None,
    limit: int = MAX_ROWS,
) -> str:
    """Execute one read-only SQLite query and return JSON-compatible rows."""
    if not 1 <= limit <= MAX_ROWS:
        raise ValueError(f"limit must be between 1 and {MAX_ROWS}")
    query = _validate_query(sql)
    path = _database_path(database_path)
    if re.match(r"^\s*pragma\b", query, re.IGNORECASE) is None:
        query = f"SELECT * FROM ({query}) LIMIT {limit}"

    try:
        with closing(sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)) as connection:
            connection.row_factory = sqlite3.Row
            rows = [dict(row) for row in connection.execute(query).fetchall()]
    except sqlite3.Error as exc:
        raise RuntimeError(f"Database query failed: {exc}") from exc

    import json

    result = json.dumps({"database": str(path), "row_count": len(rows), "rows": rows}, default=str)
    record_tool_output("fetch_database_rows", result)
    update_current_span(output=result[:4_000], metadata={"row_count": len(rows)})
    return result
