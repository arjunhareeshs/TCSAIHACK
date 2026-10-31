"""Test observe decorator with Langfuse."""

import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import settings

# Export env vars
os.environ["LANGFUSE_PUBLIC_KEY"] = settings.langfuse_public_key or ""
os.environ["LANGFUSE_SECRET_KEY"] = settings.langfuse_secret_key or ""
os.environ["LANGFUSE_BASE_URL"] = settings.langfuse_base_url
os.environ["LANGFUSE_HOST"] = settings.langfuse_base_url

from langfuse import get_client, observe, propagate_attributes

client = get_client()

@observe(name="tool:repo_find_files", as_type="tool")
def tool_find_files(pattern: str):
    return {"found": 18, "pattern": pattern}

@observe(name="agent:A0-RepoScanner", as_type="agent")
def run_agent_scanner(project: str):
    files = tool_find_files("*.py")
    return {"project": project, "files_count": files["found"]}

@observe(name="modernization-run:question", as_type="agent")
def main_run():
    with propagate_attributes(
        session_id="question",
        tags=["crewai", "groq", "modernization", "tcs-hackathon"],
        metadata={"project": "question", "framework": "crewai-v1"}
    ):
        result = run_agent_scanner("question")
        trace_url = client.get_trace_url()
        print(f"Direct Langfuse Trace URL: {trace_url}")
        return result

res = main_run()
print("Run result:", res)
client.flush()
print("Flushed successfully!")

import time
time.sleep(2)  # Give ingestion a moment

trace_url = client.get_trace_url()
print(f"Direct Langfuse Trace URL: {trace_url}")

# Query Langfuse Cloud API to confirm trace and observations
try:
    obs = client.api.observations.get_many(limit=5)
    print(f"Retrieved recent observations from Langfuse Cloud ({len(obs.data)} found):")
    for o in obs.data:
        print(f"  - [{o.type.upper()}] {o.name} (ID: {o.id}, Trace: {o.trace_id})")
except Exception as e:
    print(f"Query check: {e}")
