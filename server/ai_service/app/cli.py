"""Command-line interface for the Autonomous Legacy Modernization AI Service."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys

from app.core.config import settings
from app.modernizer.workspace import open_workspace
from app.modernizer.flows.modernization_flow import LegacyModernizationFlow
from app.modernizer.flows.async_orchestrator import AsyncModernizationOrchestrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("cli")


async def cmd_run(args):
    """Run full async modernization."""
    orchestrator = AsyncModernizationOrchestrator(project_name=args.project)
    result = await orchestrator.run_all()
    print(json.dumps(result, indent=2))


async def cmd_flow(args):
    """Run CrewAI Flow."""
    flow = LegacyModernizationFlow()
    flow.state.project_name = args.project
    result = await flow.kickoff_async()
    print("Flow completed successfully!")
    print(json.dumps(flow.state.model_dump(), indent=2))


async def cmd_facts(args):
    """Run deterministic layer only (no LLM, fast & free)."""
    orchestrator = AsyncModernizationOrchestrator(project_name=args.project)
    facts = await orchestrator.run_phase_facts()
    print("Deterministic facts collected:")
    print(json.dumps(facts, indent=2))


def cmd_review(args):
    """Display the Human Review Queue."""
    ws = open_workspace(args.project)
    store = ws.store()
    verdicts = store.query("SELECT * FROM verdicts")
    print(f"Human Review Queue for '{args.project}' ({len(verdicts)} items):")
    for v in verdicts:
        print(f"  [{v['verdict']}] {v['symbol_id']}: {v['rationale'][:120]}")


def cmd_knowledge(args):
    """Generate the Obsidian Knowledge Graph Vault."""
    from app.modernizer.knowledge import generate_knowledge_graph
    summary = generate_knowledge_graph(project_name=args.project)
    print("\n🎉 Obsidian Knowledge Graph Vault successfully generated!")
    print(f"📁 Open this vault in Obsidian: {summary['vault_path']}")
    print(json.dumps(summary, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Autonomous Legacy Modernization AI Service")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # run command
    p_run = subparsers.add_parser("run", help="Run full async modernization pipeline")
    p_run.add_argument("--project", default="question", help="Project name inside projects/ folder")

    # flow command
    p_flow = subparsers.add_parser("flow", help="Run CrewAI Flow orchestration")
    p_flow.add_argument("--project", default="question", help="Project name inside projects/ folder")

    # facts command
    p_facts = subparsers.add_parser("facts", help="Run deterministic scanner and indexer only")
    p_facts.add_argument("--project", default="question", help="Project name inside projects/ folder")

    # review command
    p_review = subparsers.add_parser("review", help="View the human review queue")
    p_review.add_argument("--project", default="question", help="Project name inside projects/ folder")

    # knowledge command
    p_kg = subparsers.add_parser("knowledge", help="Generate the Obsidian Knowledge Graph vault")
    p_kg.add_argument("--project", default="question", help="Project name inside projects/ folder")

    args = parser.parse_args()

    if args.command == "run":
        asyncio.run(cmd_run(args))
    elif args.command == "flow":
        asyncio.run(cmd_flow(args))
    elif args.command == "facts":
        asyncio.run(cmd_facts(args))
    elif args.command == "review":
        cmd_review(args)
    elif args.command == "knowledge":
        cmd_knowledge(args)


if __name__ == "__main__":
    main()
