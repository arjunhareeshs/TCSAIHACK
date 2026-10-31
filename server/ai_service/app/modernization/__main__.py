"""CLI: python -m app.modernization <project> [--facts-only] [--only A1,A2] [--reset] [--force] [--concurrency N]"""
import argparse
import asyncio
import json
import shutil
import sys

from .config import get_settings
from .orchestrator import Orchestrator
from .workspace import Workspace


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, OSError):
            pass
    ap = argparse.ArgumentParser(prog="modernization")
    ap.add_argument("project", help="folder name under server/backend/projects (referenced, never modified)")
    ap.add_argument("--facts-only", action="store_true", help="deterministic layer and reports only, no LLM")
    ap.add_argument("--only", help="comma-separated agent ids, e.g. A1,A2,A7,A8,S1,W1")
    ap.add_argument("--reset", action="store_true", help="delete this project's analysis folder first (never the project)")
    ap.add_argument("--force", action="store_true", help="re-run tasks already marked done")
    ap.add_argument("--concurrency", type=int)
    a = ap.parse_args()
    s = get_settings()
    if a.concurrency:
        s.max_concurrency = a.concurrency
    if a.reset:
        target = (s.analysis_root / a.project).resolve()
        if s.analysis_root.resolve() in target.parents:
            shutil.rmtree(target, ignore_errors=True)
    ws = Workspace(a.project, s)
    orch = Orchestrator(ws, set(a.only.split(",")) if a.only else None, a.force)
    try:
        result = asyncio.run(orch.run(a.facts_only))
    except KeyboardInterrupt:
        orch.cancel()
        print("cancelled; partial results are saved and the run can resume")
        return 130
    print(json.dumps(result, indent=1, default=str))
    print(f"analysis written to {ws.analysis_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
