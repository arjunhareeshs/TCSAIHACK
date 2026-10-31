"""Project registration and the analysis workspace layout.

Projects live in `projects/<name>/` and are read-only references. All output goes to
`analysis/<name>/.legacy-intelligence/` so the project's files and Git status stay clean.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import zipfile
from dataclasses import dataclass
from pathlib import Path

from .safety import SafetyError
from .settings import settings
from .store import Store

LAYER_DOCS = {
    "frontend": "frontend.md",
    "backend": "backend.md",
    "database": "database.md",
    "deployment": "deployment.md",
    "stack": "stack_configuration_environment_dependencies.md",
    "operational": "operational_evidence.md",
    "business": "business_logic.md",
    "research": "research.md",
    "verification": "verification_report.md",
}

MEMORY_TOPICS = ("project_context", "discovered_components", "investigation_progress", "evidence_references")

FINAL_DOCS = (
    "executive_summary.md", "current_architecture.md", "architecture_diagram.md", "dependency_map.md",
    "business_rule_catalogue.md", "modernization_heatmap.md", "technical_debt.md", "problem_catalogue.md",
    "security_assessment.md", "target_architecture.md", "migration_options.md",
    "modernization_recommendations.md", "migration_roadmap.md", "testing_and_regression_strategy.md",
    "review_queue.md",
)

_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$")
MAX_ZIP_BYTES = 500 * 1024 * 1024
ALLOWED_GIT_HOSTS = ("github.com", "gitlab.com", "bitbucket.org")


@dataclass
class Workspace:
    name: str
    project_root: Path
    out_root: Path

    @property
    def db_path(self) -> Path:
        return self.out_root / "evidence.db"

    @property
    def docs_dir(self) -> Path:
        return self.out_root

    @property
    def memory_dir(self) -> Path:
        return self.out_root / "memory"

    @property
    def final_dir(self) -> Path:
        return self.out_root / "final_analysis"

    @property
    def inputs_dir(self) -> Path:
        return self.out_root / "inputs"

    def doc_path(self, name: str) -> Path:
        if name in LAYER_DOCS:
            return self.docs_dir / LAYER_DOCS[name]
        if name in FINAL_DOCS or f"{name}.md" in FINAL_DOCS:
            return self.final_dir / (name if name.endswith(".md") else f"{name}.md")
        if name in MEMORY_TOPICS:
            return self.memory_dir / f"{name}.md"
        raise SafetyError(f"unknown document: {name}")

    def ensure(self) -> None:
        for d in (self.out_root, self.memory_dir, self.final_dir, self.inputs_dir):
            d.mkdir(parents=True, exist_ok=True)

    def store(self) -> Store:
        self.ensure()
        return Store(self.db_path)


def _check_name(name: str) -> str:
    if not _NAME.match(name):
        raise SafetyError("project name must be letters, digits, '.', '_' or '-'")
    return name


def open_workspace(name: str) -> Workspace:
    name = _check_name(name)
    root = (settings.projects_dir / name).resolve()
    if not root.is_dir():
        raise SafetyError(f"project not found: {name}")
    ws = Workspace(name=name, project_root=root, out_root=(settings.analysis_dir / name / ".legacy-intelligence").resolve())
    ws.ensure()
    return ws


def ingest_zip(name: str, zip_path: Path) -> Workspace:
    """Extract an uploaded ZIP into projects/<name>, refusing path escapes, symlinks and size bombs."""
    name = _check_name(name)
    dest = settings.projects_dir / name
    if dest.exists():
        raise SafetyError(f"project already exists: {name}")
    with zipfile.ZipFile(zip_path) as zf:
        total = sum(i.file_size for i in zf.infolist())
        if total > MAX_ZIP_BYTES:
            raise SafetyError("archive too large when extracted")
        dest.mkdir(parents=True)
        root = dest.resolve()
        for info in zf.infolist():
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                continue  # symlink entry
            target = (root / info.filename).resolve()
            if target != root and root not in target.parents:
                shutil.rmtree(dest, ignore_errors=True)
                raise SafetyError(f"archive entry escapes the project: {info.filename}")
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out)
    return open_workspace(name)


def ingest_git(name: str, url: str) -> Workspace:
    """Shallow-clone a public repository from an allowed host with hooks disabled."""
    name = _check_name(name)
    if not re.match(rf"^https://({'|'.join(re.escape(h) for h in ALLOWED_GIT_HOSTS)})/[\w.-]+/[\w.-]+(\.git)?/?$", url):
        raise SafetyError(f"only https URLs on {', '.join(ALLOWED_GIT_HOSTS)} are allowed")
    dest = settings.projects_dir / name
    if dest.exists():
        raise SafetyError(f"project already exists: {name}")
    subprocess.run(
        ["git", "-c", "core.hooksPath=/dev/null", "-c", "protocol.file.allow=never",
         "clone", "--depth", "200", "--no-recurse-submodules", url, str(dest)],
        check=True, timeout=600, capture_output=True,
    )
    return open_workspace(name)
