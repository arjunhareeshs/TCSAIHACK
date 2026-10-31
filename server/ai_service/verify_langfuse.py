"""Verify Langfuse connectivity, tracing, spans, generations, and flush."""

import os
import sys
from pathlib import Path

# Add app directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import settings

# Export to os.environ so Langfuse v5 global client and decorators pick them up
if settings.langfuse_public_key:
    os.environ["LANGFUSE_PUBLIC_KEY"] = settings.langfuse_public_key
if settings.langfuse_secret_key:
    os.environ["LANGFUSE_SECRET_KEY"] = settings.langfuse_secret_key
if settings.langfuse_base_url:
    os.environ["LANGFUSE_BASE_URL"] = settings.langfuse_base_url
    os.environ["LANGFUSE_HOST"] = settings.langfuse_base_url

print(f"Checking Langfuse configuration:")
print(f"  Public key: {settings.langfuse_public_key[:8]}...{settings.langfuse_public_key[-4:] if settings.langfuse_public_key else 'None'}")
print(f"  Base URL:   {settings.langfuse_base_url}")

from app.core.langfuse_config import get_langfuse_client
client = get_langfuse_client()

if not client:
    print("[FAIL] Client could not be created!")
    sys.exit(1)

auth = client.auth_check()
print(f"  Auth check result: {auth}")

if not auth:
    print("[FAIL] Langfuse authentication failed!")
    sys.exit(1)

print("[PASS] Langfuse authentication succeeded on cloud.langfuse.com!")

# Now test tracing with observe and context managers
from langfuse import observe, propagate_attributes
from app.core.observability import observe_agent, observe_tool, observe_generation, update_current_span, update_current_generation

print("Testing trace creation with hierarchy...")

with propagate_attributes(
    session_id="question-verification",
    tags=["test", "modernizer", "groq", "verification"],
    metadata={"system": "tcs-modernization-engine", "mode": "verification"}
):
    with client.start_as_current_observation(
        name="modernization-verification-run",
        as_type="agent",
        input={"project": "question", "action": "verify_langfuse_connectivity"},
    ) as run_obs:

        # Subagent observation (ObservationType: agent)
        with observe_agent("A0-RepoScanner", input_data={"path": "server/backend/projects/question"}) as agent_obs:
            print("  Created subagent observation: A0-RepoScanner")

            # Tool call observation (ObservationType: tool)
            with observe_tool("repo_find_files", input_data={"extension": ".py", "pattern": "*"}) as tool_obs:
                print("    Created tool observation: repo_find_files")
                if tool_obs:
                    tool_obs.update(output={"found_files": 42, "status": "success"})

            # Generation observation (ObservationType: generation)
            with observe_generation("llm-groq-analysis", input_data={"prompt": "Analyze repository architecture"}, model="groq/llama-3.3-70b-versatile") as gen_obs:
                print("    Created generation observation: llm-groq-analysis")
                if gen_obs:
                    gen_obs.update(
                        output="Analyzed repository architecture. Found 5 layers, 96 components, 23 APIs.",
                        usage_details={"input": 320, "output": 85, "total": 405}
                    )

            if agent_obs:
                agent_obs.update(output={"status": "scan_complete", "files_indexed": 42})

        if run_obs:
            run_obs.update(output={"status": "completed", "score": 1.0})

# Flush client
print("Flushing Langfuse client...")
client.flush()
print("[PASS] Successfully flushed events to Langfuse!")

# Get trace url if possible
trace_url = client.get_trace_url() if hasattr(client, "get_trace_url") else None
print(f"Current Trace URL: {trace_url}")
