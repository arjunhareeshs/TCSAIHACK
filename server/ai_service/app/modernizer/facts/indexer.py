"""Code Indexer: extracts symbols (functions, classes, methods) and edges (calls, imports)."""

from __future__ import annotations

import ast
import re
from pathlib import Path
from app.modernizer.store import Store

# Regex for JS/TS function and class declarations
JS_FUNC = re.compile(r"(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(")
JS_ARROW = re.compile(r"(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>")
JS_CLASS = re.compile(r"(?:export\s+)?class\s+([A-Za-z0-9_$]+)")


def index_python_file(path_rel: str, content: str, store: Store) -> None:
    try:
        tree = ast.parse(content, filename=path_rel)
    except SyntaxError:
        return

    symbols = []
    edges = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            sym_id = f"{path_rel}::{node.name}"
            decorators = [ast.unparse(d) for d in node.decorator_list]
            branches = sum(1 for sub in ast.walk(node) if isinstance(sub, (ast.If, ast.While, ast.For)))
            doc = ast.get_docstring(node) or ""
            business_shape = int(branches > 2 or any(k in node.name.lower() for k in ["tax", "calc", "rule", "fee", "rate", "validate"]))

            symbols.append((
                sym_id, path_rel, node.name, node.name, "function",
                node.lineno, getattr(node, "end_lineno", node.lineno),
                int(not node.name.startswith("_")),
                ",".join(decorators), branches, business_shape, doc[:500]
            ))

            for call_node in ast.walk(node):
                if isinstance(call_node, ast.Call):
                    called_name = None
                    if isinstance(call_node.func, ast.Name):
                        called_name = call_node.func.id
                    elif isinstance(call_node.func, ast.Attribute):
                        called_name = call_node.func.attr
                    if called_name:
                        edges.append((sym_id, called_name, "calls", path_rel, call_node.lineno, ""))

        elif isinstance(node, ast.ClassDef):
            sym_id = f"{path_rel}::{node.name}"
            symbols.append((
                sym_id, path_rel, node.name, node.name, "class",
                node.lineno, getattr(node, "end_lineno", node.lineno),
                int(not node.name.startswith("_")),
                "", 0, 0, (ast.get_docstring(node) or "")[:500]
            ))

    if symbols:
        store.executemany("INSERT OR REPLACE INTO symbols VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", symbols)
    if edges:
        store.executemany("INSERT INTO edges VALUES (?,?,?,?,?,?)", edges)


def index_js_file(path_rel: str, content: str, store: Store) -> None:
    symbols = []
    lines = content.splitlines()

    for idx, line in enumerate(lines, start=1):
        for pat, kind in [(JS_FUNC, "function"), (JS_ARROW, "function"), (JS_CLASS, "class")]:
            m = pat.search(line)
            if m:
                name = m.group(1)
                sym_id = f"{path_rel}::{name}"
                symbols.append((
                    sym_id, path_rel, name, name, kind,
                    idx, idx + 10,
                    1 if "export" in line else 0,
                    "", 0, 0, ""
                ))

    if symbols:
        store.executemany("INSERT OR REPLACE INTO symbols VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", symbols)


def index_repository(root: Path, store: Store) -> dict:
    rows = store.query("SELECT path, language FROM files WHERE relevant=1")
    count = 0
    for row in rows:
        path = row["path"]
        lang = row["language"]
        full = root / path
        if not full.is_file():
            continue
        try:
            content = full.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        if lang == "python":
            index_python_file(path, content, store)
            count += 1
        elif lang in ("javascript", "typescript"):
            index_js_file(path, content, store)
            count += 1

    return {"indexed_files": count}
