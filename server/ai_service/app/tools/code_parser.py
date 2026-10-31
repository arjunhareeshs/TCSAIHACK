"""Tree-sitter based source-code parsing for interactive agents."""

from __future__ import annotations

import json
from typing import Any

from crewai.tools import tool
from langfuse import observe
from app.core.observability import record_tool_output, update_current_span
from tree_sitter import Language, Parser
import tree_sitter_javascript
import tree_sitter_python
import tree_sitter_typescript

MAX_SOURCE_CHARS = 100_000
SUPPORTED_LANGUAGES = ("javascript", "python", "typescript", "tsx")


def _language(language: str) -> Language:
    normalized = language.strip().lower()
    factories = {
        "javascript": tree_sitter_javascript.language,
        "python": tree_sitter_python.language,
        "typescript": tree_sitter_typescript.language_typescript,
        "tsx": tree_sitter_typescript.language_tsx,
    }
    try:
        return Language(factories[normalized]())
    except KeyError as exc:
        supported = ", ".join(SUPPORTED_LANGUAGES)
        raise ValueError(f"Unsupported language: {language}. Use: {supported}") from exc


def _node_summary(node: Any, source: bytes, depth: int = 0) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "type": node.type,
        "named": node.is_named,
        "start": {"row": node.start_point.row + 1, "column": node.start_point.column},
        "end": {"row": node.end_point.row + 1, "column": node.end_point.column},
    }
    if depth < 2 and node.named_children:
        summary["children"] = [_node_summary(child, source, depth + 1) for child in node.named_children]
    if depth == 0:
        summary["text"] = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")
    return summary


@tool("parse_source_code")
@observe(name="parse-source-code", as_type="tool", capture_input=False, capture_output=False)
def parse_source_code(source: str, language: str) -> str:
    """Parse source code with Tree-sitter and return a bounded AST summary."""
    if not source.strip():
        raise ValueError("source must not be empty")
    if len(source) > MAX_SOURCE_CHARS:
        raise ValueError(f"source must be at most {MAX_SOURCE_CHARS} characters")

    source_bytes = source.encode("utf-8")
    parser = Parser(_language(language))
    tree = parser.parse(source_bytes)
    root = tree.root_node
    result = {
        "language": language.strip().lower(),
        "has_error": root.has_error,
        "root_type": root.type,
        "ast": _node_summary(root, source_bytes),
    }
    output = json.dumps(result, ensure_ascii=False)
    record_tool_output("parse_source_code", output)
    update_current_span(output=output[:4_000], metadata={"has_error": root.has_error})
    return output
