"""Repository scanner: inventory, language, layer, entry points. No LLM."""
import os
import re
from dataclasses import dataclass
from pathlib import Path

from .util import read_text

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", "dist", "build", ".venv", "venv", "env", ".idea", ".vscode",
    ".next", "coverage", ".pytest_cache", ".mypy_cache", "target", "bin", "obj", ".gradle", ".terraform",
    ".legacy-intelligence", "site-packages",
}
BINARY_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp", ".mp3", ".mp4", ".wav", ".zip", ".gz",
    ".tar", ".7z", ".exe", ".dll", ".so", ".dylib", ".class", ".jar", ".pyc", ".woff", ".woff2", ".ttf", ".eot",
    ".sqlite", ".db", ".bin", ".pt", ".onnx", ".pkl",
}
DOC_BINARY_EXT = {".pdf", ".docx", ".doc", ".pptx", ".xlsx"}
LANG = {
    ".py": "python", ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".ts": "typescript",
    ".tsx": "typescript", ".java": "java", ".cs": "csharp", ".go": "go", ".php": "php", ".rb": "ruby",
    ".sql": "sql", ".html": "html", ".css": "css", ".scss": "css", ".json": "json", ".yml": "yaml",
    ".yaml": "yaml", ".md": "markdown", ".txt": "text", ".sh": "shell", ".toml": "toml", ".ini": "ini",
    ".cfg": "ini", ".tf": "terraform", ".cbl": "cobol", ".cob": "cobol", ".xml": "xml", ".vue": "vue",
    ".mmd": "mermaid", ".rst": "text",
}
CODE_EXT = {".py", ".js", ".jsx", ".mjs", ".ts", ".tsx", ".java", ".cs", ".go", ".php", ".rb", ".cbl", ".cob", ".vue"}
FRONT_EXT = {".tsx", ".jsx", ".vue", ".html", ".css", ".scss", ".svelte"}
FRONT_DIRS = {"client", "frontend", "web", "ui", "webapp", "public", "static", "templates"}
CONFIG_NAMES = {
    "package.json", "requirements.txt", "pyproject.toml", "setup.py", "setup.cfg", "pipfile", "pom.xml",
    "build.gradle", "go.mod", "gemfile", "composer.json", "tsconfig.json", "metadata.json", ".gitignore",
    "pytest.ini", "tox.ini", ".prettierrc", "crontab",
}
GENERATED_NAMES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "pipfile.lock", "composer.lock"}
ENTRY_NAMES = {
    "main.py", "app.py", "run.py", "manage.py", "wsgi.py", "asgi.py", "server.js", "index.js", "main.ts",
    "main.tsx", "index.tsx", "index.html", "program.cs",
}
ENTRY_CONTENT = re.compile(
    r"FastAPI\(|Flask\(|express\(\)|createRoot\(|ReactDOM\.render|if __name__ == ['\"]__main__['\"]|SpringApplication\.run"
)
DB_CONTENT = re.compile(
    r"sqlalchemy|sqlite3|psycopg|pymongo|mongoose|prisma|sequelize|typeorm|chromadb|supabase|asyncpg|"
    r"\.execute\(|cursor\(|SELECT\s.+\sFROM|INSERT\s+INTO|createClient\(",
    re.I,
)
RELEVANT_LAYERS = {"frontend", "backend", "database", "infra", "config"}


@dataclass
class FileRow:
    path: str
    layer: str
    lang: str
    size: int
    lines: int
    generated: int
    entry: int
    relevant: int
    module: str
    db: int


def is_test(parts: tuple[str, ...], name: str) -> bool:
    return (
        any(p in ("tests", "test", "__tests__", "spec", "e2e") for p in parts[:-1])
        or name.startswith("test_") or name.endswith(("_test.py", ".test.ts", ".test.tsx", ".test.js", ".spec.ts", ".spec.js", ".spec.tsx"))
    )


def classify(rel: str) -> tuple[str, str]:
    parts = tuple(Path(rel).parts)
    name = parts[-1].lower()
    ext = Path(name).suffix
    lang = LANG.get(ext, "other")
    if ext in BINARY_EXT:
        return "asset", lang
    if ext in DOC_BINARY_EXT:
        return "docs", lang
    if is_test(parts, name):
        return "test", lang
    lower_parts = [p.lower() for p in parts]
    if (name == "dockerfile" or name.startswith(("docker-compose", "dockerfile.")) or ".github" in lower_parts
            or any(p in ("k8s", "kubernetes", "nginx", "terraform", "helm", "ansible", "deploy") for p in lower_parts[:-1])
            or ext in (".tf", ".sh") and "infrastructure" in lower_parts):
        return "infra", lang
    if ext == ".sql" or any(p in ("migrations", "alembic") for p in lower_parts[:-1]):
        return "database", lang
    if (name in CONFIG_NAMES or name.startswith((".env", "vite.config", "webpack.config", "next.config", "tsconfig"))
            or ext in (".toml", ".ini", ".cfg")):
        return "config", lang
    if ext in (".md", ".rst", ".txt", ".mmd"):
        return "docs", lang
    if ext in FRONT_EXT:
        return "frontend", lang
    if ext in (".ts", ".js", ".jsx") and any(p in FRONT_DIRS for p in lower_parts[:-1]):
        return "frontend", lang
    if ext in CODE_EXT:
        return "backend", lang
    if ext in (".json", ".yml", ".yaml", ".xml"):
        return "config", lang
    return "other", lang


def module_of(rel: str) -> str:
    """Logical module = the file's folder, at most three levels deep (server/app/engine, client/components)."""
    parts = Path(rel).parts
    if len(parts) == 1:
        return "."
    return "/".join(parts[:-1][:3])


def scan(root: Path) -> list[FileRow]:
    rows: list[FileRow] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d.lower() not in SKIP_DIRS and not d.endswith(".egg-info"))
        for fn in sorted(filenames):
            full = Path(dirpath) / fn
            rel = full.relative_to(root).as_posix()
            layer, lang = classify(rel)
            try:
                size = full.stat().st_size
            except OSError:
                continue
            name = fn.lower()
            generated = int(name in GENERATED_NAMES or name.endswith((".min.js", ".map", ".lock")))
            text = read_text(full) if layer != "asset" and not generated and Path(fn).suffix.lower() not in DOC_BINARY_EXT else None
            lines = text.count("\n") + 1 if text else 0
            entry = int(name in ENTRY_NAMES or bool(text and ENTRY_CONTENT.search(text[:20000])))
            if layer in ("test", "docs", "asset", "other"):
                entry = 0
            db = int(bool(text and layer in ("backend", "database") and DB_CONTENT.search(text)))
            rows.append(FileRow(
                rel, layer, lang, size, lines, generated, entry,
                int(layer in RELEVANT_LAYERS and not generated), module_of(rel), db,
            ))
    return rows
