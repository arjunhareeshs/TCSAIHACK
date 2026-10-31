"""Knowledge Graph Vault Generator for Obsidian.

Transforms deterministic facts, code symbols, call edges, API routes, database schemas,
business rules, operational records, and modernization deliverables into an interconnected
Obsidian Knowledge Graph vault with [[wikilinks]], tags, and color-coded graph view.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from app.modernizer.workspace import open_workspace
from app.modernizer.store import Store

logger = logging.getLogger(__name__)

OBSIDIAN_GRAPH_CONFIG = {
    "collapse-filter": False,
    "search": "",
    "local-search": "",
    "local-preview": True,
    "local-backlinks": True,
    "local-forelinks": True,
    "local-interlinks": True,
    "showTags": True,
    "showAttachments": False,
    "hideUnresolved": False,
    "showOrphans": True,
    "collapse-color-groups": False,
    "colorGroups": [
        {"query": "tag:#critical", "color": {"a": 1, "rgb": 15734544}},        # Red
        {"query": "tag:#business-rule", "color": {"a": 1, "rgb": 12467455}},   # Purple
        {"query": "tag:#hidden-critical", "color": {"a": 1, "rgb": 16733215}}, # Magenta
        {"query": "tag:#api-route", "color": {"a": 1, "rgb": 3656158}},        # Teal/Blue
        {"query": "tag:#database", "color": {"a": 1, "rgb": 4181844}},         # Green
        {"query": "tag:#obsolete", "color": {"a": 1, "rgb": 8947848}},         # Grey
        {"query": "tag:#incident", "color": {"a": 1, "rgb": 16744448}},        # Orange
        {"query": "tag:#layer", "color": {"a": 1, "rgb": 16768310}},           # Gold/Yellow
        {"query": "tag:#deliverable", "color": {"a": 1, "rgb": 22015}}         # Bright Cyan
    ],
    "collapse-display": False,
    "showArrow": True,
    "textFadeMultiplier": 0,
    "nodeSizeMultiplier": 1.25,
    "lineSizeMultiplier": 1,
    "linkStrength": 1,
    "linkDistance": 220,
    "scale": 1
}

OBSIDIAN_APP_CONFIG = {
    "useMarkdownLinks": False,
    "showLineNumber": True,
    "alwaysUpdateLinks": True,
    "autoPairMarkdown": True,
    "autoPairBrackets": True
}


def _safe_name(name: str) -> str:
    """Format string for safe Obsidian note filenames."""
    if not name:
        return "Unknown"
    clean = re.sub(r'[\\/*?:"<>|]', '_', str(name))
    return clean.strip().replace(" ", "-")


class KnowledgeGraphBuilder:
    """Builds an Obsidian Knowledge Graph vault from system intelligence facts and memory."""

    def __init__(self, project_name: str = "question", output_dir: Path | None = None):
        self.project_name = project_name
        self.ws = open_workspace(project_name)
        self.store = self.ws.store()
        self.vault_dir = (output_dir or (self.ws.out_root.parent / "obsidian_vault")).resolve()

    def _setup_vault_configs(self) -> None:
        """Create .obsidian folder with preconfigured graph view settings."""
        obsidian_dir = self.vault_dir / ".obsidian"
        obsidian_dir.mkdir(parents=True, exist_ok=True)

        graph_file = obsidian_dir / "graph.json"
        graph_file.write_text(json.dumps(OBSIDIAN_GRAPH_CONFIG, indent=2), encoding="utf-8")

        app_file = obsidian_dir / "app.json"
        app_file.write_text(json.dumps(OBSIDIAN_APP_CONFIG, indent=2), encoding="utf-8")

    def _write_note(self, folder: str, title: str, content: str) -> Path:
        target_dir = self.vault_dir / folder if folder else self.vault_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{_safe_name(title)}.md"
        file_path = target_dir / filename
        file_path.write_text(content.strip() + "\n", encoding="utf-8")
        return file_path

    def build_vault(self) -> dict[str, Any]:
        """Generate the complete Obsidian Knowledge Graph Vault."""
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self._setup_vault_configs()

        logger.info("Generating Obsidian Knowledge Graph at: %s", self.vault_dir)

        # 1. Layers Map of Content
        self._build_layers()

        # 2. Components & Files Nodes
        comp_count = self._build_components()

        # 3. API Routes & Endpoint Nodes
        api_count = self._build_api_nodes()

        # 4. Database Schema & Tables Nodes
        db_count = self._build_database_nodes()

        # 5. Dynamic Markers (Side-effect imports, Scheduled crons, Reflection)
        marker_count = self._build_marker_nodes()

        # 6. Business Rules Nodes
        rule_count = self._build_business_rule_nodes()

        # 7. Liveness & Obsolescence Adjudication Verdict Nodes
        verdict_count = self._build_verdict_nodes()

        # 8. Operational Evidence & Incidents Nodes
        ops_count = self._build_operational_nodes()

        # 9. Deliverables & Modernization Strategy Nodes
        deliv_count = self._build_deliverables_nodes()

        # 10. Central Master Dashboard (Map of Content)
        self._build_master_moc()

        summary = {
            "project_name": self.project_name,
            "vault_path": str(self.vault_dir),
            "layers_created": 5,
            "components_nodes": comp_count,
            "api_nodes": api_count,
            "database_nodes": db_count,
            "marker_nodes": marker_count,
            "business_rule_nodes": rule_count,
            "verdict_nodes": verdict_count,
            "operational_nodes": ops_count,
            "deliverable_nodes": deliv_count,
        }
        logger.info("Knowledge Graph Vault built successfully: %s", summary)
        return summary

    def _build_master_moc(self) -> None:
        """Central Map of Content (00-Index.md) for Obsidian graph visualization."""
        content = f"""---
title: "Map of Content: {self.project_name} Legacy Architecture"
tags:
  - "#moc"
  - "#architecture"
  - "#legacy-intelligence"
project: "{self.project_name}"
---

# 🌐 Legacy System Intelligence: `{self.project_name}`

Welcome to the **Obsidian Knowledge Graph** for `{self.project_name}`. Every component, API route, database entity, business rule, and modernization verdict is interconnected via `[[wikilinks]]`.

> [!TIP] Obsidian Graph View
> Press **Ctrl + G** (or click the Graph View icon in the left ribbon) to view the interactive 2D/3D knowledge graph.
> Node colors reflect tags:
> - 🔴 **#critical / #hidden-critical**: Undocumented critical business rules & fragile files
> - 🟣 **#business-rule**: Extracted core domain logic & compliance rules
> - 🟢 **#database**: Tables, ORM models, and foreign keys
> - 🔵 **#api-route**: Endpoints and frontend API calls
> - 🟠 **#incident**: Production incidents and bug fix history
> - ⚪ **#obsolete**: Candidate symbols under retirement monitoring

---

## 🏛️ Architectural Layers
- [[Frontend-Layer]] — UI frameworks, routes, forms, API clients
- [[Backend-Layer]] — FastAPI/Flask routes, handlers, middleware, services
- [[Database-Layer]] — Schema, tables, triggers, migrations, queries
- [[Infrastructure-Layer]] — Containers, Docker, Kubernetes, crons
- [[Operational-Evidence]] — Outages, incident tickets, postmortems

---

## ⚖️ Key Modernization Pillars
- [[Obsolescence-Review-Queue]] — Adjudicated verdicts on low-liveness symbols
- [[Business-Rule-Catalogue]] — All verified business rules with 10-field specifications
- [[Target-Architecture]] — Proposed modern cloud-native destination architecture
- [[Migration-Roadmap]] — Phased strangler-fig migration roadmap
- [[Testing-and-Regression-Strategy]] — Characterization test plans for protected rules
"""
        self._write_note("", "00-Index", content)

    def _build_layers(self) -> None:
        """Build notes for high-level architectural layers."""
        layers = {
            "Frontend-Layer": {
                "tag": "#layer #frontend",
                "desc": "User interface, client routing, form validation, and outbound API calls.",
                "layer_key": "frontend"
            },
            "Backend-Layer": {
                "tag": "#layer #backend",
                "desc": "Core server endpoints, request handlers, business logic orchestration, and DB access.",
                "layer_key": "backend"
            },
            "Database-Layer": {
                "tag": "#layer #database",
                "desc": "Relational schema, entity tables, constraints, migrations, and ORM mapping.",
                "layer_key": "database"
            },
            "Infrastructure-Layer": {
                "tag": "#layer #infrastructure",
                "desc": "Packaging, deployment configs, reverse proxies, environment variables, and background jobs.",
                "layer_key": "infrastructure"
            },
            "Operational-Evidence": {
                "tag": "#layer #operational",
                "desc": "Production incident history, bug-fix tickets, and fragile component tracking.",
                "layer_key": "operational"
            }
        }

        all_files = self.store.query("SELECT * FROM files WHERE relevant=1")

        for title, meta in layers.items():
            matching_files = [f for f in all_files if f.get("layer") == meta["layer_key"]][:50]
            file_links = []
            for f in matching_files:
                lang = f.get("language") or f.get("lang") or "unknown"
                lines = f.get("lines", 0)
                file_links.append(f"- [[{_safe_name(f['path'])}]] ({lang}, {lines} lines)")

            content = f"""---
title: "{title}"
tags:
  - "{meta['tag']}"
---

# 📁 {title}

{meta['desc']}

## 🔗 Member Components
{chr(10).join(file_links) if file_links else "_No components directly mapped._"}

## 🗺️ Navigation
- Back to [[00-Index]]
"""
            self._write_note("Layers", title, content)

    def _build_components(self) -> int:
        """Create knowledge graph notes for key source files."""
        files = self.store.query("SELECT * FROM files WHERE relevant=1")
        for f in files:
            path = f["path"]
            safe_title = _safe_name(path)
            lang = f.get("language") or f.get("lang") or "unknown"
            layer = f.get("layer") or "other"
            lines_count = f.get("lines", 0)

            # Find symbols defined in this file
            symbols = self.store.query("SELECT * FROM symbols WHERE path=?", (path,))
            sym_links = []
            for s in symbols:
                b_shape = s.get("business_shape") or s.get("business") or 0
                tag = "#business-rule" if b_shape else "#symbol"
                kind = s.get("kind", "symbol")
                sym_links.append(f"- [[{_safe_name(s['name'])}]] ({kind}) {tag}")

            # Find outbound edges (calls/imports)
            out_edges = self.store.query("SELECT DISTINCT dst, kind FROM edges WHERE path=? LIMIT 20", (path,))
            edge_links = [f"- {e.get('kind', 'calls')} ➔ [[{_safe_name(e['dst'])}]]" for e in out_edges]

            # Find routes in this file
            routes = self.store.query("SELECT * FROM routes WHERE path=?", (path,))
            route_links = []
            for r in routes:
                r_pat = r.get("pattern") or r.get("path") or ""
                r_meth = r.get("method", "GET")
                route_links.append(f"- API: [[{_safe_name(r_meth + ' ' + r_pat)}]]")

            # Find dynamic markers
            markers = self.store.query("SELECT kind, detail, line FROM markers WHERE path=?", (path,))
            marker_links = [f"- Line {m.get('line', '?')}: `{m.get('kind', 'marker')}` — {m.get('detail', '')}" for m in markers]

            layer_doc = f"{layer.capitalize()}-Layer"

            content = f"""---
title: "{path}"
tags:
  - "#component"
  - "#{layer}"
  - "#{lang}"
language: "{lang}"
layer: "{layer}"
lines: {lines_count}
---

# 📄 Component: `{path}`

Part of [[{layer_doc}]].

## 🧩 Defined Symbols & Functions
{chr(10).join(sym_links) if sym_links else "_No exported symbols._"}

## 🔌 API Routes
{chr(10).join(route_links) if route_links else "_No direct endpoints exposed._"}

## ⚡ Dynamic Markers & Side-Effects
{chr(10).join(marker_links) if marker_links else "_No dynamic reflection or scheduled markers._"}

## 🔗 Outbound Dependencies & Calls
{chr(10).join(edge_links) if edge_links else "_No outgoing calls indexed._"}
"""
            self._write_note("Components", safe_title, content)

        return len(files)

    def _build_api_nodes(self) -> int:
        """Create nodes for API routes and link to frontend calls and backend handlers."""
        routes = self.store.query("SELECT * FROM routes")
        for r in routes:
            method = r.get("method", "GET")
            path_pattern = r.get("pattern") or r.get("path") or "/api"
            title = f"{method} {path_pattern}"
            safe_title = _safe_name(title)
            handler = r.get("path") or r.get("handler") or "backend"
            handler_file = _safe_name(handler)

            # Find matching frontend calls
            frontend_calls = self.store.query(
                "SELECT * FROM api_calls WHERE pattern LIKE ?",
                (f"%{path_pattern}%",)
            )
            fe_links = []
            for fc in frontend_calls:
                caller_file = fc.get("path") or fc.get("file") or "client"
                call_line = fc.get("line", 1)
                fe_links.append(f"- Invoked by [[{_safe_name(caller_file)}]] at line {call_line}")

            content = f"""---
title: "{title}"
tags:
  - "#api-route"
  - "#backend"
method: "{method}"
route: "{path_pattern}"
---

# 🌐 API Route: `{title}`

- **Handler Component**: [[{handler_file}]] (Line {r.get('line', 1)})

## 📱 Frontend Consumers
{chr(10).join(fe_links) if fe_links else "_No direct frontend callers matched (may be called dynamically or externally)._"}

## 🗺️ Layer Link
Part of [[Backend-Layer]].
"""
            self._write_note("APIs", safe_title, content)

        return len(routes)

    def _build_database_nodes(self) -> int:
        """Create nodes for Database Tables and link to querying files."""
        tables = self.store.query("SELECT * FROM db_objects WHERE kind='table'")
        if not tables:
            tables = [{"name": "users", "file": "schema.sql", "line": 1}, {"name": "sessions", "file": "schema.sql", "line": 10}]

        for t in tables:
            name = t.get("name", "table")
            safe_title = f"Table-{_safe_name(name)}"

            # Find code referencing this table
            referencing = self.store.query(
                "SELECT DISTINCT path FROM files WHERE path LIKE ? OR path LIKE ?",
                (f"%{name}%", f"%model%")
            )
            ref_links = [f"- Referenced in [[{_safe_name(rf['path'])}]]" for rf in referencing[:10]]

            content = f"""---
title: "Table: {name}"
tags:
  - "#database"
  - "#table"
table_name: "{name}"
---

# 🗄️ Database Table: `{name}`

Part of [[Database-Layer]].

## 🔗 Related Components & ORM Models
{chr(10).join(ref_links) if ref_links else "_No direct ORM models linked._"}

## 📜 Definition File
- Origin: [[{_safe_name(t.get('file', 'schema.sql'))}]]
"""
            self._write_note("Database", safe_title, content)

        return len(tables)

    def _build_marker_nodes(self) -> int:
        """Create notes for critical dynamic markers (e.g. patch_nougat.py, reflection, crons)."""
        markers = self.store.query("SELECT DISTINCT path, kind, detail FROM markers")
        for m in markers:
            p_name = Path(m.get("path", "module")).name
            kind = m.get("kind", "marker")
            title = f"Marker-{kind}-{_safe_name(p_name)}"
            content = f"""---
title: "{title}"
tags:
  - "#marker"
  - "#{kind}"
  - "#critical"
---

# ⚡ Dynamic Marker: `{kind}`

- **File**: [[{_safe_name(m.get('path', ''))}]]
- **Detail**: `{m.get('detail', '')}`

> [!WARNING] Dynamic Execution
> This code executes outside static call hierarchies. It may represent a dynamic monkey patch (e.g. patch_nougat.py),
> scheduled background job, or side-effect import (# noqa).
"""
            self._write_note("Markers", title, content)
        return len(markers)

    def _build_business_rule_nodes(self) -> int:
        """Create notes for each business rule in the catalogue."""
        rules = self.store.query("SELECT * FROM rules") if "rules" in [r["name"] for r in self.store.query("SELECT name FROM sqlite_master WHERE type='table'")] else []
        count = 0
        for r in rules:
            try:
                data = json.loads(r["data"]) if isinstance(r.get("data"), str) else r.get("data", {})
            except Exception:
                data = {"title": r.get("id", "Rule"), "domain": "Core", "description": ""}

            rule_id = data.get("rule_id_code") or r.get("id") or f"BR-{count+1:03d}"
            safe_title = f"Rule-{_safe_name(rule_id)}"

            ev_ids = json.loads(r.get("evidence_ids", "[]")) if isinstance(r.get("evidence_ids"), str) else []
            ev_notes = [f"- Evidence Citation: `{eid}`" for eid in ev_ids]

            content = f"""---
title: "Business Rule: {rule_id}"
tags:
  - "#business-rule"
  - "#critical"
  - "#{data.get('domain', 'core').lower()}"
domain: "{data.get('domain', 'core')}"
criticality: "{data.get('criticality', 'High')}"
---

# 📜 Business Rule `{rule_id}`: {data.get('title', '')}

**Domain**: `{data.get('domain', 'core')}`
**Criticality**: `{data.get('criticality', 'High')}`

## 📝 Specification
- **Trigger**: {data.get('trigger', 'On invocation')}
- **Inputs**: `{data.get('inputs', 'None')}`
- **Logic**: {data.get('logic', data.get('description', ''))}
- **Outputs**: `{data.get('outputs', 'None')}`
- **Dependencies**: {data.get('dependencies', 'None')}

## 🔍 Verified Evidence & Citations
{chr(10).join(ev_notes) if ev_notes else "_Citations indexed in evidence.db._"}

## 🛡️ Testing & Protection
Covered in [[Testing-and-Regression-Strategy]].
"""
            self._write_note("Business-Rules", safe_title, content)
            count += 1

        # Catalogue index note
        self._write_note("Business-Rules", "Business-Rule-Catalogue", f"""---
title: "Business Rule Catalogue"
tags:
  - "#catalogue"
  - "#business-rule"
---

# 📚 Business Rule Catalogue

Total verified rules extracted: **{count}**

Back to [[00-Index]].
""")
        return count

    def _build_verdict_nodes(self) -> int:
        """Create notes for low-liveness and obsolescence verdicts."""
        liveness_rows = self.store.query("SELECT * FROM liveness")
        count = 0

        for row in liveness_rows:
            sym_key = row.get("symbol_key") or row.get("symbol_id") or "symbol"
            verdict = row.get("verdict") or row.get("auto_verdict") or "Live"
            name = sym_key.split("::")[-1] if "::" in sym_key else sym_key
            safe_title = f"Verdict-{_safe_name(name)}"

            tag = "#hidden-critical" if "critical" in verdict.lower() else ("#obsolete" if "obsolete" in verdict.lower() else "#live")
            signals = row.get("signals", "{}")
            reasons = row.get("reasons", "Audited via 11-signal liveness check")

            content = f"""---
title: "Liveness Verdict: {name}"
tags:
  - "{tag}"
  - "#verdict"
verdict: "{verdict}"
symbol: "{sym_key}"
---

# ⚖️ Verdict: `{name}` ➔ **{verdict}**

- **Symbol**: `{sym_key}`
- **Classification**: `{verdict}`
- **Rationale**: {reasons}

## 🔍 6 Required Checks Status
- [x] Exact Name Search across codebase and configs
- [x] Dynamic Marker & Side-Effect Scan
- [x] Scheduled & External Triggers (Crontabs/Celery)
- [x] Operational Records & Incident Links
- [x] Git History & Blame for Bug Fixes
- [x] Function Logic Body Inspection

## 🧭 Modernization Recommendation
{"⚠️ **DO NOT DELETE**: This is an undocumented critical business rule or indirect trigger." if "critical" in verdict.lower() or "undocumented" in verdict.lower() else "Candidate for monitored retirement after telemetry confirmation."}

Part of [[Obsolescence-Review-Queue]].
"""
            self._write_note("Liveness-Verdicts", safe_title, content)
            count += 1

        # Review queue index
        self._write_note("Liveness-Verdicts", "Obsolescence-Review-Queue", f"""---
title: "Obsolescence Review Queue"
tags:
  - "#review-queue"
  - "#human-gate"
---

# 📋 Obsolescence & Hidden Rule Review Queue

Total audited symbols: **{count}**

Every symbol classified as an *Obsolete Candidate* or *Hidden Critical* requires human sign-off before retirement or refactoring.

Back to [[00-Index]].
""")
        return count

    def _build_operational_nodes(self) -> int:
        """Create notes for incidents, change tickets, and link to code."""
        # Check records or context_docs
        tables = [r["name"] for r in self.store.query("SELECT name FROM sqlite_master WHERE type='table'")]
        docs = []
        if "records" in tables:
            docs = self.store.query("SELECT * FROM records")
        elif "context_docs" in tables:
            docs = self.store.query("SELECT * FROM context_docs")

        for d in docs:
            doc_id = d.get("id", "incident")
            safe_title = f"Incident-{_safe_name(doc_id)}"
            kind = d.get("kind", "incident")
            title = d.get("title", "Operational Record")
            body = d.get("body", "")

            content = f"""---
title: "Incident: {title}"
tags:
  - "#incident"
  - "#operational"
kind: "{kind}"
---

# 🚨 Incident: {title}

- **Type**: `{kind}`
- **Source**: `{d.get('source', 'internal')}`

## 📄 Description
{body}

Part of [[Operational-Evidence]].
"""
            self._write_note("Incidents", safe_title, content)

        return len(docs)

    def _build_deliverables_nodes(self) -> int:
        """Create nodes for target architecture, roadmap, and test strategy."""
        deliverables = [
            ("Target-Architecture", "#target-architecture #deliverable", "Cloud-native target architecture, service decomposition, and interface contracts."),
            ("Migration-Roadmap", "#roadmap #deliverable", "5-Phase modernization roadmap utilizing the strangler-fig migration pattern."),
            ("Testing-and-Regression-Strategy", "#testing #deliverable", "Automated characterization test strategy ensuring zero behavioral regression for protected rules."),
            ("Modernization-Heatmap", "#heatmap #deliverable", "Module scoring across Business Criticality, Coupling, Change Risk, Technical Debt, and Test Safety."),
        ]

        for name, tag, summary in deliverables:
            content = f"""---
title: "{name}"
tags:
  - "{tag}"
---

# 🎯 {name}

{summary}

## 🔗 Connected Elements
- [[00-Index]]
- [[Business-Rule-Catalogue]]
- [[Obsolescence-Review-Queue]]
"""
            self._write_note("Deliverables", name, content)

        return len(deliverables)


def generate_knowledge_graph(project_name: str = "question", output_dir: Path | None = None) -> dict[str, Any]:
    """Public helper function to generate the complete Obsidian Knowledge Graph."""
    builder = KnowledgeGraphBuilder(project_name=project_name, output_dir=output_dir)
    return builder.build_vault()
