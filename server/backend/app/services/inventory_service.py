from pathlib import Path

from app.schemas.projects import InventoryEntry

_LANGUAGES = {
    ".py": "Python", ".java": "Java", ".js": "JavaScript",
    ".jsx": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
    ".c": "C", ".h": "C", ".cpp": "C++", ".cc": "C++",
    ".cs": "C#", ".cob": "COBOL", ".cbl": "COBOL", ".php": "PHP",
    ".rb": "Ruby", ".go": "Go", ".sql": "SQL", ".sh": "Shell",
    ".bash": "Shell", ".html": "HTML", ".htm": "HTML", ".css": "CSS",
}
_DOC_EXTENSIONS = {".md", ".rst", ".txt", ".adoc", ".pdf", ".doc", ".docx"}
_CONFIG_NAMES = {".env", "dockerfile", "makefile", "requirements.txt", "pom.xml", "build.gradle"}
_GENERATED_PARTS = {"node_modules", ".git", "__pycache__", "dist", "build", "target", ".venv"}


def build_inventory(root: Path) -> list[InventoryEntry]:
    inventory = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        parts = {part.lower() for part in relative.parts}
        extension = path.suffix.lower()
        name = path.name.lower()
        language = _LANGUAGES.get(extension)
        if parts & _GENERATED_PARTS:
            category = "generated"
        elif extension in _DOC_EXTENSIONS:
            category = "documentation"
        elif name in _CONFIG_NAMES or name.startswith("."):
            category = "configuration"
        elif language:
            category = "source"
        else:
            category = "binary"
        inventory.append(
            InventoryEntry(
                relative_path=relative.as_posix(),
                extension=extension,
                size=path.stat().st_size,
                category=category,
                language=language,
            )
        )
    return sorted(inventory, key=lambda item: item.relative_path)
