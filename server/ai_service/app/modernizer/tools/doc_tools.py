"""Document and memory tools: read_document, write_section, read_memory, append_memory, validate_document."""

from __future__ import annotations

import json
import time
from crewai.tools import tool
from app.modernizer.safety import mask_secrets
from app.modernizer.tools.repo_tools import _get_active_ws
from app.modernizer.workspace import MEMORY_TOPICS

MAX_MEMORY_ROWS = 100


@tool("read_document")
def read_document(name: str) -> str:
    """Read an analysis markdown document or memory note."""
    ws = _get_active_ws()
    try:
        path = ws.doc_path(name)
        if not path.is_file():
            return json.dumps({"ok": True, "data": "", "note": "Document not yet created"})
        content = path.read_text(encoding="utf-8")
        return json.dumps({"ok": True, "data": content, "error": None})
    except Exception as e:
        return json.dumps({"ok": False, "data": "", "error": str(e)})


@tool("write_section")
def write_section(document_name: str, heading: str, markdown: str) -> str:
    """Write or update a markdown section in an owned document. Avoids duplicating sections."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    try:
        path = ws.doc_path(document_name)
        path.parent.mkdir(parents=True, exist_ok=True)
        content = path.read_text(encoding="utf-8") if path.is_file() else ""

        safe_markdown = mask_secrets(markdown)
        section_header = f"## {heading}" if not heading.startswith("#") else heading

        if section_header in content:
            # Replace existing section up to next header
            parts = content.split(section_header, 1)
            rest = parts[1]
            next_header_pos = rest.find("\n## ")
            if next_header_pos != -1:
                new_content = parts[0] + f"{section_header}\n\n{safe_markdown}\n\n" + rest[next_header_pos+1:]
            else:
                new_content = parts[0] + f"{section_header}\n\n{safe_markdown}\n"
        else:
            new_content = content.rstrip() + f"\n\n{section_header}\n\n{safe_markdown}\n"

        path.write_text(new_content.strip() + "\n", encoding="utf-8")
        res = {"ok": True, "data": f"Section '{heading}' updated in {document_name}", "error": None}
    except Exception as e:
        res = {"ok": False, "data": None, "error": str(e)}

    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "write_section", {"doc": document_name, "heading": heading}, ms, len(str(res)), res["ok"])
    return json.dumps(res)


@tool("read_memory")
def read_memory(topic: str) -> str:
    """Read shared memory notes across agents for a given topic."""
    ws = _get_active_ws()
    store = ws.store()
    if topic not in MEMORY_TOPICS:
        return json.dumps({"ok": False, "data": [], "truncated": False, "error": f"Unknown memory topic: {topic}"})
    total = store.query_one("SELECT COUNT(*) AS count FROM memory WHERE topic=?", (topic,))["count"]
    rows = store.query(
        "SELECT note, evidence_ids, agent, created FROM memory "
        "WHERE topic=? ORDER BY created ASC LIMIT ?",
        (topic, MAX_MEMORY_ROWS),
    )
    return json.dumps({
        "ok": True,
        "data": rows,
        "truncated": total > MAX_MEMORY_ROWS,
        "error": None,
    })


@tool("append_memory")
def append_memory(topic: str, note: str, evidence_ids: list[str]) -> str:
    """Append a synthesized fact to shared cross-agent memory."""
    t0 = time.time()
    ws = _get_active_ws()
    store = ws.store()
    if topic not in MEMORY_TOPICS:
        return json.dumps({"ok": False, "data": None, "error": f"Unknown memory topic: {topic}"})
    if not note or not note.strip():
        return json.dumps({"ok": False, "data": None, "error": "note must not be empty"})
    if not isinstance(evidence_ids, list) or not all(isinstance(item, str) for item in evidence_ids):
        return json.dumps({"ok": False, "data": None, "error": "evidence_ids must be a list of strings"})

    safe_note = mask_secrets(note)
    created = time.time()
    memory_path = ws.memory_dir / f"{topic}.md"
    memory_path.parent.mkdir(parents=True, exist_ok=True)
    entry = (
        f"\n### Memory entry {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(created))}\n\n"
        f"{safe_note.strip()}\n\n"
        f"Evidence: {', '.join(evidence_ids) if evidence_ids else 'none'}\n"
    )
    try:
        with memory_path.open("a", encoding="utf-8") as memory_file:
            memory_file.write(entry)
    except OSError as exc:
        return json.dumps({"ok": False, "data": None, "error": f"Unable to update memory file: {exc}"})

    store.execute(
        "INSERT INTO memory (topic, note, evidence_ids, agent, created) VALUES (?, ?, ?, ?, ?)",
        (topic, safe_note, json.dumps(evidence_ids), "agent", created),
    )
    res = {"ok": True, "data": "Memory recorded", "error": None}
    ms = int((time.time() - t0) * 1000)
    store.log_audit("agent", "append_memory", {"topic": topic}, ms, len(str(res)), True)
    return json.dumps(res)


@tool("validate_document")
def validate_document(document_name: str) -> str:
    """Validate completeness, citations, and structure of an analysis document."""
    ws = _get_active_ws()
    try:
        path = ws.doc_path(document_name)
        if not path.is_file():
            return json.dumps({"ok": False, "error": f"Document does not exist: {document_name}"})
        content = path.read_text(encoding="utf-8")
        has_citations = "ev-" in content or "line" in content.lower()
        res = {
            "ok": True,
            "data": {
                "document": document_name,
                "length_chars": len(content),
                "has_citations": has_citations,
                "sections_count": content.count("\n## ")
            },
            "error": None
        }
    except Exception as e:
        res = {"ok": False, "error": str(e)}
    return json.dumps(res)
