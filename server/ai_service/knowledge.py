"""Standalone CLI script to build and update the Obsidian Knowledge Graph Vault.

Usage:
    python knowledge.py --project question
    python knowledge.py --project question --output ./my_vault
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

# Add app to path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from app.modernizer.knowledge import generate_knowledge_graph

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("knowledge-cli")


def main():
    parser = argparse.ArgumentParser(
        description="Generate an interconnected Obsidian Knowledge Graph vault for a legacy codebase"
    )
    parser.add_argument(
        "--project",
        default="question",
        help="Target project name inside server/backend/projects/ (default: question)"
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional destination path for the Obsidian vault directory"
    )

    args = parser.parse_args()

    out_path = Path(args.output).resolve() if args.output else None
    logger.info("Generating knowledge graph for project '%s'...", args.project)

    try:
        summary = generate_knowledge_graph(project_name=args.project, output_dir=out_path)
        print("\n========================================================")
        print("[SUCCESS] OBSIDIAN KNOWLEDGE GRAPH GENERATED SUCCESSFULLY!")
        print("========================================================")
        print(f"Vault Location: {summary['vault_path']}")
        print(f"Nodes Generated:")
        print(f"   - Layers:          {summary['layers_created']}")
        print(f"   - Components:      {summary['components_nodes']}")
        print(f"   - API Routes:      {summary['api_nodes']}")
        print(f"   - Database Tables: {summary['database_nodes']}")
        print(f"   - Dynamic Markers: {summary['marker_nodes']}")
        print(f"   - Business Rules:  {summary['business_rule_nodes']}")
        print(f"   - Verdicts:        {summary['verdict_nodes']}")
        print(f"   - Deliverables:    {summary['deliverable_nodes']}")
        print("\nHOW TO VIEW IN OBSIDIAN:")
        print("   1. Open Obsidian")
        print("   2. Click 'Open folder as vault'")
        print(f"   3. Select the folder: {summary['vault_path']}")
        print("   4. Press 'Ctrl + G' (or click Graph View in the left sidebar)")
        print("   5. Explore the interactive, color-coded 2D/3D knowledge graph!")
        print("========================================================\n")
    except Exception as exc:
        logger.error("Failed to build knowledge graph: %s", exc, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
