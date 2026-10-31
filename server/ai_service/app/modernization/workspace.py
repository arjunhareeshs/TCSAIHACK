"""Workspace: analysis folder outside the project, documents, citation gate and findings."""
import json
import re
from pathlib import Path

from .config import Settings, get_settings
from .store import Store
from .util import mask_secrets, read_text, safe_path, sha1

CONFIDENCE = ("Verified", "Inferred", "Potential", "Unknown")
SEVERITY = ("info", "low", "medium", "high", "critical")
CATEGORIES = (
    "architecture", "business_rule", "dependency", "security", "technical_debt", "performance", "reliability",
    "deployment", "database", "obsolescence", "operational", "conflict", "gap",
)

MEMORY_DOCS = {
    "project_context": "memory/project_context.md",
    "discovered_components": "memory/discovered_components.md",
    "investigation_progress": "memory/investigation_progress.md",
    "evidence_references": "memory/evidence_references.md",
}
LAYER_DOCS = [
    "frontend.md", "backend.md", "database.md", "deployment.md", "stack_configuration_environment_dependencies.md",
    "operational_evidence.md", "business_logic.md", "research.md",
]
FINAL_DOCS = [
    "executive_summary.md", "current_architecture.md", "architecture_diagram.md", "dependency_map.md",
    "technical_debt.md", "problem_catalogue.md", "security_assessment.md", "target_architecture.md",
    "migration_options.md", "modernization_recommendations.md", "migration_roadmap.md",
    "testing_and_regression_strategy.md", "business_rule_catalogue.md", "modernization_heatmap.md", "review_queue.md",
    "verification_report.md",
]
DOCS: dict[str, str] = {**MEMORY_DOCS, **{d: d for d in LAYER_DOCS}, **{d: f"final_analysis/{d}" for d in FINAL_DOCS}}
for _d in list(DOCS):
    DOCS[_d.removesuffix(".md")] = DOCS[_d]

EVIDENCE_REF = re.compile(r"\[(?:E)(\d+)\]")


class Workspace:
    def __init__(self, project: str, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.project = project
        self.root = (self.settings.projects_root / project).resolve()
        if not self.root.is_dir():
            raise FileNotFoundError(f"project not found: {self.root}")
        self.analysis_dir = (self.settings.analysis_root / project / ".legacy-intelligence").resolve()
        if self.root in self.analysis_dir.parents:
            raise ValueError("analysis directory must be outside the project folder")
        for sub in ("memory", "final_analysis", "inputs"):
            (self.analysis_dir / sub).mkdir(parents=True, exist_ok=True)
        self.store = Store(self.analysis_dir / "evidence.db")

    # ---------- evidence and findings ----------
    def cite(self, path: str, start: int, end: int, note: str, agent: str) -> int:
        p = safe_path(self.root, path)
        text = read_text(p)
        if text is None:
            raise ValueError(f"cannot cite {path}: not a readable text file")
        lines = text.splitlines()
        if not (1 <= start <= end <= len(lines)):
            raise ValueError(f"lines {start}-{end} are outside {path} (file has {len(lines)} lines)")
        if end - start >= 200:
            raise ValueError("cite at most 200 lines; cite the specific lines that prove the claim")
        rel = p.relative_to(self.root).as_posix()
        sha = sha1("\n".join(lines[start - 1:end]))
        row = self.store.one("SELECT id FROM evidence WHERE path=? AND start=? AND end=? AND sha=? AND agent=?", (rel, start, end, sha, agent))
        if row:
            return row["id"]
        return self.store.run("INSERT INTO evidence(path,start,end,sha,note,agent) VALUES (?,?,?,?,?,?)", (rel, start, end, sha, note[:300], agent))

    def add_finding(self, agent: str, category: str, title: str, description: str, confidence: str,
                    severity: str, evidence_ids: list[int], open_question: str = "", payload: dict | None = None) -> int:
        if confidence not in CONFIDENCE:
            raise ValueError(f"confidence must be one of {CONFIDENCE}")
        if severity not in SEVERITY:
            raise ValueError(f"severity must be one of {SEVERITY}")
        if category not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}")
        ids = sorted({int(i) for i in evidence_ids})
        found = {r["id"] for r in self.store.query(f"SELECT id FROM evidence WHERE id IN ({','.join('?' * len(ids))})", ids)} if ids else set()
        missing = [i for i in ids if i not in found]
        if missing:
            raise ValueError(f"evidence ids do not exist: {missing}. Call cite_code first and use the returned id")
        need = {"Verified": 1, "Inferred": 2}.get(confidence, 0)
        if len(found) < need:
            raise ValueError(f"{confidence} findings need at least {need} distinct cited evidence id(s); got {len(found)}")
        if confidence in ("Potential", "Unknown") and not open_question.strip():
            raise ValueError(f"{confidence} findings must state the open_question that would resolve them")
        fid = self.store.run(
            "INSERT INTO findings(agent,category,title,description,confidence,severity,open_question,payload) VALUES (?,?,?,?,?,?,?,?)",
            (agent, category, title[:200], mask_secrets(description)[:3000], confidence, severity, open_question[:500], json.dumps(payload or {})),
        )
        self.store.many("INSERT INTO finding_evidence VALUES (?,?)", [(fid, e) for e in ids])
        return fid

    def validate_citations(self) -> dict:
        """Re-hash every cited range. Findings whose evidence changed or vanished become stale."""
        bad = []
        for e in self.store.query("SELECT * FROM evidence"):
            text = read_text(self.root / e["path"]) if (self.root / e["path"]).is_file() else None
            lines = text.splitlines() if text else []
            ok = bool(lines) and e["end"] <= len(lines) and sha1("\n".join(lines[e["start"] - 1:e["end"]])) == e["sha"]
            if not ok:
                bad.append(e["id"])
        stale = 0
        if bad:
            for f in self.store.query(f"SELECT DISTINCT finding_id FROM finding_evidence WHERE evidence_id IN ({','.join('?' * len(bad))})", bad):
                self.store.run("UPDATE findings SET status='stale' WHERE id=? AND status='active'", (f["finding_id"],))
                stale += 1
        total = self.store.one("SELECT COUNT(*) n FROM evidence")["n"]
        return {"checked": total, "invalid_evidence_ids": bad, "findings_marked_stale": stale}

    # ---------- documents ----------
    def doc_path(self, name: str) -> Path:
        rel = DOCS.get(name) or DOCS.get(name.removesuffix(".md"))
        if not rel:
            raise ValueError(f"unknown document '{name}'. Known: {sorted(k for k in DOCS if k.endswith('.md'))}")
        return self.analysis_dir / rel

    def read_doc(self, name: str) -> str:
        p = self.doc_path(name)
        return p.read_text(encoding="utf-8") if p.exists() else ""

    def write_section(self, name: str, heading: str, markdown: str) -> None:
        p = self.doc_path(name)
        heading = heading.strip().lstrip("#").strip()
        title = p.stem.replace("_", " ").title()
        text = p.read_text(encoding="utf-8") if p.exists() else f"# {title}\n\n"
        parts = re.split(r"(?m)^(?=## )", text)
        head, sections = parts[0], parts[1:]
        block = f"## {heading}\n\n{mask_secrets(markdown).strip()}\n\n"
        for i, s in enumerate(sections):
            if s.splitlines()[0].strip() == f"## {heading}":
                sections[i] = block
                break
        else:
            sections.append(block)
        p.write_text(head + "".join(sections), encoding="utf-8")

    def append_memory(self, topic: str, note: str, agent: str) -> None:
        if topic not in MEMORY_DOCS:
            raise ValueError(f"topic must be one of {sorted(MEMORY_DOCS)}")
        p = self.analysis_dir / MEMORY_DOCS[topic]
        if not p.exists():
            p.write_text(f"# {topic.replace('_', ' ').title()}\n\n", encoding="utf-8")
        with p.open("a", encoding="utf-8") as fh:
            fh.write(f"- [{agent}] {mask_secrets(note).strip()}\n")

    def validate_document(self, name: str, required: list[str] | None = None) -> dict:
        text = self.read_doc(name)
        heads = {ln[3:].strip() for ln in text.splitlines() if ln.startswith("## ")}
        missing = [h for h in (required or []) if h not in heads]
        ids = {int(m) for m in EVIDENCE_REF.findall(text)}
        known = {r["id"] for r in self.store.query("SELECT id FROM evidence")} if ids else set()
        unsupported = [ln.strip()[:100] for ln in text.splitlines()
                       if "Verified" in ln and not EVIDENCE_REF.search(ln) and "Verified, Inferred" not in ln and not ln.lstrip().startswith(("#", "|--", "> "))]
        return {"exists": bool(text), "missing_sections": missing, "unknown_evidence_ids": sorted(ids - known),
                "verified_lines_without_citation": unsupported[:8], "ok": bool(text) and not missing and not (ids - known)}
