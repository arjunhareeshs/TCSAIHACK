"""Single-command runner for Autonomous CrewAI Modernization Analysis.

Usage:
    python run_ai.py "C:\\A I  - P R O J E C T S\\grassroots-extraction"
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

# Ensure UTF-8 output encoding on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Add ai_service to Python path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

from app.modernizer.flows.async_orchestrator import AsyncModernizationOrchestrator


async def main():
    if len(sys.argv) < 2:
        print("Usage: python run_ai.py <project_folder_or_name>")
        print(r'Example: python run_ai.py "C:\A I  - P R O J E C T S\grassroots-extraction"')
        sys.exit(1)

    project_input = sys.argv[1].strip("\"'")
    print(f"\n🚀 Launching Autonomous CrewAI Modernization on: {project_input}\n")

    orchestrator = AsyncModernizationOrchestrator(project_name=project_input)
    result = await orchestrator.run_all()

    print("\n" + "=" * 60)
    print("🎉 MODERNIZATION & CREWAI EXECUTION COMPLETE!")
    print("=" * 60)
    print(json.dumps(result, indent=2))
    print(f"\n📁 Reports & Analysis written to:\n   {result.get('output_directory')}")
    if result.get("knowledge_vault"):
        print(f"🧠 Obsidian Knowledge Vault:\n   {result.get('knowledge_vault')}")


if __name__ == "__main__":
    asyncio.run(main())
