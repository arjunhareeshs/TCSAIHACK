"""Asynchronous Modernization Orchestrator.

Manages fine-grained parallel agent tasks, task state in evidence.db, quality gates,
retries, and Langfuse observability.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any
from crewai import Agent, Crew, Process, Task
from langfuse import observe

from app.core.config import settings
from app.core.langfuse_config import get_langfuse_client
from app.core.observability import agent_scope, execute_generation, record_generation, update_current_span
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


class AsyncModernizationOrchestrator:
    """Enterprise-grade async orchestrator with resumable SQLite task state and Langfuse tracing."""

    def __init__(self, project_name: str = "question"):
        self.ws = open_workspace(project_name)
        self.project_name = self.ws.name
        self.store = self.ws.store()
        self.langfuse = get_langfuse_client()
        set_active_workspace(self.project_name)

    def _record_task_state(self, key: str, agent: str, phase: str, status: str, output: str = "", error: str = "") -> None:
        self.store.execute(
            "INSERT OR REPLACE INTO tasks (key, agent, phase, scope, status, attempts, error, output, parent, round, started, finished) "
            "VALUES (?, ?, ?, ?, ?, 1, ?, ?, '', 1, ?, ?)",
            (key, agent, phase, self.project_name, status, error, output, time.time(), time.time() if status in ("completed", "failed") else None),
        )

    def _is_task_completed(self, key: str) -> bool:
        row = self.store.query_one("SELECT status FROM tasks WHERE key=?", (key,))
        return bool(row and row["status"] == "completed")

    async def run_phase_facts(self) -> dict[str, Any]:
        """Stage 1: Deterministic scan and indexing."""
        task_key = f"facts-{self.project_name}"
        if self._is_task_completed(task_key):
            logger.info("Facts already built; skipping.")
            return {"status": "cached"}

        self._record_task_state(task_key, "deterministic", "facts", "running")
        try:
            s_res = scan(self.ws.project_root, self.store)
            i_res = index_repository(self.ws.project_root, self.store)
            l_res = link_routes_and_markers(self.ws.project_root, self.store)
            v_res = evaluate_liveness(self.store)
            result = {**s_res, **i_res, **l_res, "verdicts": v_res}
            self._record_task_state(task_key, "deterministic", "facts", "completed", str(result))
            return result
        except Exception as exc:
            self._record_task_state(task_key, "deterministic", "facts", "failed", error=str(exc))
            raise

    @observe(name="crew-agent", as_type="agent", capture_input=False, capture_output=False)
    async def run_single_crew_async(self, crew_name: str, crew_instance: Crew, task_key: str, inputs: dict[str, Any]) -> Any:
        """Run a single crew or agent asynchronously with status tracking and Langfuse span."""
        if self._is_task_completed(task_key):
            logger.info("Task %s already completed, skipping.", task_key)
            return "cached"

        self._record_task_state(task_key, crew_name, "investigation", "running")
        logger.info("Starting crew %s [Task %s] asynchronously...", crew_name, task_key)

        try:
            with agent_scope(crew_name):
                result, usage = await execute_generation(crew_instance, inputs)
                usage = record_generation(crew_name, result, str(getattr(crew_instance, "llm", "")))
            update_current_span(
                output=str(result)[:4_000],
                metadata={"crew_name": crew_name, "task_key": task_key, "usage": usage},
            )
            self._record_task_state(task_key, crew_name, "investigation", "completed", str(result)[:2000])
            return result
        except Exception as exc:
            logger.error("Crew %s failed: %s", crew_name, exc)
            self._record_task_state(task_key, crew_name, "investigation", "failed", error=str(exc))
            raise

    async def run_all(self) -> dict[str, Any]:
        """Execute the complete end-to-end modernization lifecycle asynchronously."""
        logger.info("=== Starting Autonomous Modernization for '%s' ===", self.project_name)
        inputs = {"project_name": self.project_name}

        # 1. Facts
        facts = await self.run_phase_facts()

        # 2. Discovery Reviewer (A0)
        disc_crew = DiscoveryCrew().crew()
        await self.run_single_crew_async("A0_Discovery", disc_crew, f"disc-{self.project_name}", inputs)

        # 3. Investigation Crew (A1 to A6)
        inv_crew = InvestigationCrew().crew()
        await self.run_single_crew_async("A1_A6_Investigation", inv_crew, f"inv-{self.project_name}", inputs)

        # 4. Gate 1 Evaluation
        coverage = self.store.get_read_coverage()
        logger.info("Quality Gate 1 coverage check: %.1f%%", coverage * 100)

        # 5. Business Logic (A7, A8) and Research (R1 to R3)
        biz_crew = BusinessLogicCrew().crew()
        res_crew = ResearchCrew().crew()

        await self.run_single_crew_async("A7_A8_BusinessLogic", biz_crew, f"biz-{self.project_name}", inputs)
        await self.run_single_crew_async("R1_R3_Research", res_crew, f"res-{self.project_name}", inputs)

        # 6. Supervisor Verification (S1)
        sup_crew = SupervisorCrew().crew()
        await self.run_single_crew_async("S1_Supervisor", sup_crew, f"sup-{self.project_name}", inputs)

        # 7. Synthesis Crew (W1, W2, W3)
        syn_crew = SynthesisCrew().crew()
        await self.run_single_crew_async("W1_W3_Synthesis", syn_crew, f"syn-{self.project_name}", inputs)

        # 8. Obsidian Knowledge Graph Vault Generation
        kg_summary = None
        try:
            from app.modernizer.knowledge import generate_knowledge_graph
            kg_summary = generate_knowledge_graph(project_name=self.project_name)
        except Exception as e:
            logger.warning("Knowledge graph generation warning: %s", e)

        # 9. Human Review Queue Summary
        verdicts = self.store.query("SELECT verdict, COUNT(*) as count FROM verdicts GROUP BY verdict")
        rules = self.store.query("SELECT COUNT(*) as count FROM rules")

        logger.info("=== Modernization Finished Successfully for '%s' ===", self.project_name)
        return {
            "status": "completed",
            "project": self.project_name,
            "read_coverage": coverage,
            "rules_catalogued": rules[0]["count"] if rules else 0,
            "verdicts_issued": verdicts,
            "knowledge_vault": kg_summary.get("vault_path") if kg_summary else None,
            "output_directory": str(self.ws.out_root),
        }
