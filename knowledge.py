"""Top-level CLI shortcut for generating the Obsidian Knowledge Graph Vault.

Usage:
    python knowledge.py
    python knowledge.py --project question
"""

import sys
from pathlib import Path

# Add server/ai_service to sys.path
AI_SERVICE_DIR = Path(__file__).resolve().parent / "server" / "ai_service"
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))

from knowledge import main

if __name__ == "__main__":
    main()
