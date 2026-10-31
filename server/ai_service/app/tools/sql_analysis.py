"""SQL parsing and AST analysis using SQLGlot."""

from __future__ import annotations

import json
from typing import Any

import sqlglot
from crewai.tools import tool
from langfuse import observe
from sqlglot import exp
from app.core.observability import record_tool_output, update_current_span

MAX_SQL_CHARS = 50_000


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


@tool("analyze_sql")
@observe(name="analyze-sql", as_type="tool", capture_input=False, capture_output=False)
def analyze_sql(sql: str, dialect: str = "sqlite") -> str:
    """Parse SQL with SQLGlot and return its statement, tables, columns, and AST."""
    sql = sql.strip()
    if not sql:
        raise ValueError("sql must not be empty")
    if len(sql) > MAX_SQL_CHARS:
        raise ValueError(f"sql must be at most {MAX_SQL_CHARS} characters")

    try:
        expression = sqlglot.parse_one(sql, read=dialect)
    except sqlglot.errors.ParseError as exc:
        raise ValueError(f"SQL could not be parsed: {exc}") from exc

    tables = [table.sql(dialect=dialect) for table in expression.find_all(exp.Table)]
    columns = [column.sql(dialect=dialect) for column in expression.find_all(exp.Column)]
    result: dict[str, Any] = {
        "dialect": dialect,
        "statement_type": expression.key,
        "tables": _unique(tables),
        "columns": _unique(columns),
        "normalized_sql": expression.sql(dialect=dialect),
        "ast": expression.dump(),
    }
    output = json.dumps(result, ensure_ascii=False)
    record_tool_output("analyze_sql", output)
    update_current_span(output=output[:4_000], metadata={"statement_type": expression.key})
    return output
