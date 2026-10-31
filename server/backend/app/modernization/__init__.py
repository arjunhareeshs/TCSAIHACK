"""Autonomous Legacy Modernization Agent (TCS AI Hackathon, Challenge 03).

Layers:
    facts/        deterministic analysis, no LLM (scanner, indexer, linker, liveness, debt)
    store.py      SQLite evidence store shared by code and agents
    tools/        guarded tool functions plus the CrewAI adapter
    agents/       agent catalogue (roles, goals, tool grants, owned documents)
    orchestrator  async phases, quality gates, rework, human review, adapt
"""
