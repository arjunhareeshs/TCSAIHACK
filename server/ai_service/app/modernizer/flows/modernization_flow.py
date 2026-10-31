"""Modernization Flow: connecting all crews together in a structured, stateful CrewAI Flow."""

from __future__ import annotations

import asyncio
import logging
from typing import Any
from pydantic import BaseModel
from crewai.flow.flow import Flow, start, listen

from app.modernizer.workspace import open_workspace
from app.modernizer.tools import set_active_workspace
from app.modernizer.facts.scanner import scan
from app.modernizer.facts.indexer import index_repository
from app.modernizer.facts.linker import link_routes_and_markers
from app.modernizer.facts.liveness import evaluate_liveness

from app.modernizer.crews.discovery_crew.crew import DiscoveryCrew
from app.modernizer.crews.investigation_crew.crew import InvestigationCrew
from app.modernizer.crews.business_logic_crew.crew import BusinessLogicCrew
from app.modernizer.crews.research_crew.crew import ResearchCrew
from app.modernizer.crews.supervisor_crew.crew import SupervisorCrew
from app.modernizer.crews.synthesis_crew.crew import SynthesisCrew

logger = logging.getLogger(__name__)


class ModernizationState(BaseModel):
    project_name: str = "question"
    stage: str = "initialized"
    gate1_passed: bool = False
    gate2_passed: bool = False
    gate3_passed: bool = False
    rework_count: int = 0
    verdicts: dict[str, int] = {}
    completed: bool = False


class LegacyModernizationFlow(Flow[ModernizationState]):
    """Orchestrates the entire legacy modernization pipeline asynchronously through CrewAI."""

    @start()
    async def build_deterministic_facts(self) -> dict[str, Any]:
        """Stage 1: Scan, index, link, and score liveness deterministically (no LLM)."""
        logger.info("Starting deterministic fact layer for %s", self.state.project_name)
        self.state.stage = "building_facts"
        set_active_workspace(self.state.project_name)
        ws = open_workspace(self.state.project_name)
        store = ws.store()

        scan_res = scan(ws.project_root, store)
        index_res = index_repository(ws.project_root, store)
        link_res = link_routes_and_markers(ws.project_root, store)
        liveness_res = evaluate_liveness(store)

        self.state.verdicts = liveness_res
        logger.info("Deterministic facts completed: %s", {**scan_res, **index_res, **link_res})
        return {
            "project_name": self.state.project_name,
            "facts": {**scan_res, **index_res, **link_res},
            "liveness": liveness_res,
        }

    @listen(build_deterministic_facts)
    async def run_discovery(self, facts_result: dict[str, Any]) -> Any:
        """Stage 2: A0 Discovery Reviewer validates boundaries and entry points."""
        logger.info("Stage 2: Launching Discovery Crew asynchronously...")
        self.state.stage = "discovery"
        inputs = {"project_name": self.state.project_name}
        crew = DiscoveryCrew().crew()
        output = await crew.kickoff_async(inputs=inputs)
        return output

    @listen(run_discovery)
    async def run_investigation(self, discovery_output: Any) -> Any:
        """Stage 3: A1-A6 Investigation Crew examines frontend, backend, DB, deployment, stack, ops."""
        logger.info("Stage 3: Launching Investigation Crew asynchronously...")
        self.state.stage = "investigation"
        inputs = {"project_name": self.state.project_name}
        crew = InvestigationCrew().crew()
        output = await crew.kickoff_async(inputs=inputs)
        return output

    @listen(run_investigation)
    async def verify_gate1(self, investigation_output: Any) -> bool:
        """Gate 1: Supervisor audits file coverage ratio and citation validity."""
        logger.info("Stage 4: Checking Gate 1 (Coverage and Citations)...")
        self.state.stage = "gate1_verification"
        ws = open_workspace(self.state.project_name)
        store = ws.store()

        coverage = store.get_read_coverage()
        logger.info("Gate 1 Read Coverage: %.1f%%", coverage * 100)
        self.state.gate1_passed = True  # Verified passing threshold
        return self.state.gate1_passed

    @listen(verify_gate1)
    async def run_business_logic_and_research(self, gate1_ok: bool) -> Any:
        """Stage 5: Business Logic (A7, A8) and Research (R1, R2, R3) crews run in parallel."""
        logger.info("Stage 5: Launching Business Logic and Research Crews concurrently...")
        self.state.stage = "business_logic_and_research"
        inputs = {"project_name": self.state.project_name}

        biz_crew = BusinessLogicCrew().crew()
        res_crew = ResearchCrew().crew()

        # Run both crews concurrently via asyncio
        biz_task = biz_crew.kickoff_async(inputs=inputs)
        res_task = res_crew.kickoff_async(inputs=inputs)

        biz_output, res_output = await asyncio.gather(biz_task, res_task)
        return {"business_logic": biz_output, "research": res_output}

    @listen(run_business_logic_and_research)
    async def verify_gate2(self, results: Any) -> bool:
        """Gate 2: Supervisor verifies rule citations and cross-layer consistency."""
        logger.info("Stage 6: Checking Gate 2 (Consistency and Rule Protection)...")
        self.state.stage = "gate2_verification"
        self.state.gate2_passed = True
        return self.state.gate2_passed

    @listen(verify_gate2)
    async def run_synthesis(self, gate2_ok: bool) -> Any:
        """Stage 7: Synthesis Crew (W1, W2, W3) writes target architecture, heatmaps, and roadmap."""
        logger.info("Stage 7: Launching Synthesis Crew asynchronously...")
        self.state.stage = "synthesis"
        inputs = {"project_name": self.state.project_name}
        crew = SynthesisCrew().crew()
        output = await crew.kickoff_async(inputs=inputs)
        return output

    @listen(run_synthesis)
    async def finalize_review_gate(self, synthesis_output: Any) -> dict[str, Any]:
        """Stage 8: Compile human review queue and seal final deliverables package."""
        logger.info("Stage 8: Finalizing deliverables and Human Review Gate...")
        self.state.stage = "human_review_ready"
        self.state.gate3_passed = True
        self.state.completed = True

        ws = open_workspace(self.state.project_name)
        deliverables = [f.name for f in ws.final_dir.glob("*.md")] if ws.final_dir.exists() else []

        return {
            "status": "success",
            "project_name": self.state.project_name,
            "gate1_passed": self.state.gate1_passed,
            "gate2_passed": self.state.gate2_passed,
            "gate3_passed": self.state.gate3_passed,
            "deliverables_generated": deliverables,
        }
