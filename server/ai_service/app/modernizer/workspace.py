"""Project registration and the analysis workspace layout.

Projects live in `server/backend/projects/<name>/` and are read-only references.
All analysis output goes to `server/backend/analysis/<name>/.legacy-intelligence/`
so the project's own files and Git status stay clean.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from app.core.config import settings
from app.modernizer.safety import SafetyError, resolve_inside
from app.modernizer.store import Store

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

MEMORY_TOPICS = (
    "project_context",
    "discovered_components",
    "investigation_progress",
    "evidence_references",
)

FINAL_DOCS = (
    "executive_summary.md",
    "current_architecture.md",
    "architecture_diagram.md",
    "dependency_map.md",
    "business_rule_catalogue.md",
    "modernization_heatmap.md",
    "technical_debt.md",
    "problem_catalogue.md",
    "security_assessment.md",
    "target_architecture.md",
    "migration_options.md",
    "modernization_recommendations.md",
    "migration_roadmap.md",
    "testing_and_regression_strategy.md",
    "review_queue.md",
)

_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$")


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
        if not isinstance(name, str) or not name.strip():
            raise SafetyError("Document name is required")
        clean_name = name.lower().replace(".md", "")
        for layer, doc_file in LAYER_DOCS.items():
            if clean_name == layer or clean_name == doc_file.replace(".md", ""):
                return self.docs_dir / doc_file

        for doc_file in FINAL_DOCS:
            if clean_name == doc_file.replace(".md", "") or name == doc_file:
                return self.final_dir / (doc_file if not name.endswith(".md") else name)

        if clean_name in MEMORY_TOPICS:
            return self.memory_dir / f"{clean_name}.md"

        # Fallback to general markdown in the analysis workspace only.
        relative_name = f"{name}.md" if not name.endswith(".md") else name
        return resolve_inside(self.out_root, relative_name)

    def ensure(self) -> None:
        for d in (self.out_root, self.memory_dir, self.final_dir, self.inputs_dir):
            d.mkdir(parents=True, exist_ok=True)

    def store(self) -> Store:
        self.ensure()
        return Store(self.db_path)


def open_workspace(name: str) -> Workspace:
    """Open or initialize a workspace for the specified project or directory path."""
    target_path = Path(name)
    if target_path.is_dir():
        project_root = target_path.resolve()
        clean_name = project_root.name
    elif _NAME_PATTERN.match(name):
        clean_name = name
        projects_dir = Path(settings.projects_dir).resolve()
        project_root = (projects_dir / name).resolve()

        if not project_root.is_dir():
            # Also check root projects directory fallback
            alt_root = (Path(settings.projects_dir).parents[1] / "projects" / name).resolve()
            if alt_root.is_dir():
                project_root = alt_root
            else:
                raise SafetyError(f"Project directory not found: {project_root}")
    else:
        raise SafetyError(f"Invalid project name or path: {name}")

    analysis_dir = Path(settings.analysis_dir).resolve()
    out_root = (analysis_dir / clean_name / ".legacy-intelligence").resolve()

    ws = Workspace(name=clean_name, project_root=project_root, out_root=out_root)
    ws.ensure()
    return ws
