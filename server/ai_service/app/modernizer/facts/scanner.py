"""Repository scanner: file inventory with language, layer and relevance."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
from app.modernizer.store import Store

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env", ".tox", ".mypy_cache", ".pytest_cache",
    "dist", "build", "out", "target", "bin", "obj", ".next", ".nuxt", "coverage", ".idea", ".vscode",
    "vendor", "bower_components", ".gradle", ".terraform", ".legacy-intelligence",
    "checkpoint-260", "checkpoint-312",
}
GENERATED_HINTS = (".min.js", ".min.css", ".map", ".lock", "-lock.json", ".pb.go", "_pb2.py", ".generated.")

LANGUAGES = {
    ".py": "python", ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript", ".java": "java", ".kt": "kotlin", ".cs": "csharp",
    ".go": "go", ".rb": "ruby", ".php": "php", ".rs": "rust", ".scala": "scala", ".swift": "swift",
    ".c": "c", ".h": "c", ".cpp": "cpp", ".hpp": "cpp", ".cbl": "cobol", ".cob": "cobol", ".cpy": "cobol",
    ".vb": "vbnet", ".pls": "plsql", ".pkb": "plsql", ".sql": "sql", ".html": "html", ".css": "css",
    ".scss": "css", ".vue": "vue", ".svelte": "svelte", ".sh": "shell", ".ps1": "powershell", ".bat": "batch",
    ".yaml": "yaml", ".yml": "yaml", ".json": "json", ".toml": "toml", ".ini": "ini", ".cfg": "ini",
    ".xml": "xml", ".properties": "properties", ".md": "markdown", ".rst": "markdown", ".txt": "text",
    ".proto": "protobuf", ".graphql": "graphql", ".tf": "terraform", ".mmd": "mermaid",
}
BINARY_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx",
    ".zip", ".gz", ".tar", ".7z", ".jar", ".war", ".class", ".dll", ".exe", ".so", ".dylib", ".pyc",
    ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".wav", ".db", ".sqlite", ".bin", ".pkl", ".pt",
    ".safetensors", ".pth",
}
CODE_LANGS = {
    "python", "javascript", "typescript", "java", "kotlin", "csharp", "go", "ruby", "php", "rust", "scala",
    "swift", "c", "cpp", "cobol", "vbnet", "plsql", "sql", "vue", "svelte", "shell", "powershell",
}
MANIFESTS = {
    "package.json", "requirements.txt", "pyproject.toml", "setup.py", "setup.cfg", "pipfile", "pom.xml",
    "build.gradle", "build.gradle.kts", "go.mod", "cargo.toml", "gemfile", "composer.json", "packages.config",
}
FRONTEND_DIRS = {"client", "frontend", "web", "ui", "app-ui", "public", "static", "components", "pages", "views", "src-ui"}
BACKEND_DIRS = {"server", "backend", "api", "services", "service", "app", "core", "engine", "src", "lib"}
DB_DIRS = {"migrations", "migration", "db", "database", "sql", "schema", "alembic", "flyway", "liquibase"}
INFRA_DIRS = {"deploy", "deployment", "infra", "infrastructure", "k8s", "kubernetes", "helm", "terraform", ".github", "docker", "ops", "ci"}
DOC_DIRS = {"docs", "doc", "documentation", "wiki"}


def classify_layer(rel: str, language: str) -> str:
    parts = [p.lower() for p in rel.split("/")]
    name = parts[-1]
    dirs = set(parts[:-1])
    if any(p in {"test", "tests", "__tests__", "spec", "e2e"} for p in parts) or name.startswith("test_") or ".test." in name or ".spec." in name:
        return "test"
    if name in {"dockerfile", "docker-compose.yml", "docker-compose.yaml", "jenkinsfile", "procfile", "nginx.conf", "crontab"} \
            or name.startswith("dockerfile") or dirs & INFRA_DIRS or language == "terraform":
        return "infrastructure"
    if language == "sql" or dirs & DB_DIRS:
        return "database"
    if language == "markdown" or dirs & DOC_DIRS:
        return "docs"
    if name in MANIFESTS or name.endswith((".lock", "-lock.json")) or language in {"yaml", "toml", "ini", "properties", "json", "xml"} \
            or name.startswith(".env"):
        return "config"
    if language in {"html", "css", "vue", "svelte"} or name.endswith((".jsx", ".tsx")) or dirs & FRONTEND_DIRS:
        return "frontend"
    if language in CODE_LANGS:
        return "backend"
    return "other"


def scan(root: Path, store: Store) -> dict:
    rows = []
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and not d.endswith(".egg-info"))
        for fname in sorted(filenames):
            full = Path(dirpath) / fname
            if full.is_symlink():
                continue
            rel = full.relative_to(root).as_posix()
            ext = full.suffix.lower()
            language = "dockerfile" if fname.lower().startswith("dockerfile") else LANGUAGES.get(ext, "unknown")
            try:
                size = full.stat().st_size
            except OSError:
                continue
            binary = ext in BINARY_EXT
            lines, sha = 0, ""
            if not binary and size <= 5_000_000:
                data = full.read_bytes()
                if b"\x00" in data[:4096]:
                    binary = True
                else:
                    lines = data.count(b"\n") + (1 if data and not data.endswith(b"\n") else 0)
                    sha = hashlib.sha1(data).hexdigest()
            generated = any(h in fname.lower() for h in GENERATED_HINTS)
            layer = "binary" if binary else classify_layer(rel, language)
            relevant = not binary and not generated and layer not in {"other"} and language != "unknown"
            rows.append((rel, language, layer, size, lines, sha, int(generated), int(binary), int(relevant), None))
    store.executemany("INSERT OR REPLACE INTO files VALUES (?,?,?,?,?,?,?,?,?,?)", rows)
    return {"total_files": len(rows), "relevant_files": sum(1 for r in rows if r[8])}
