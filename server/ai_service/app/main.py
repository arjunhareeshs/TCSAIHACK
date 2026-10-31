"""AI Service FastAPI entry point.

Exposes endpoints for triggering asynchronous modernization runs, inspecting progress,
retrieving the human review queue, and accessing final architectural deliverables.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from langfuse import observe

from app.core.config import settings
from app.core.langfuse_config import check_langfuse_connection, flush_langfuse, get_langfuse_client
from app.core.observability import flush, metrics_snapshot, update_current_span
from app.modernizer.workspace import open_workspace
from app.modernizer.flows.modernization_flow import LegacyModernizationFlow
from app.modernizer.flows.async_orchestrator import AsyncModernizationOrchestrator

app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="Autonomous Legacy Modernization AI Service using CrewAI",
)

ACTIVE_RUNS: dict[str, dict[str, Any]] = {}
RUN_STREAMS: dict[str, set[asyncio.Queue[dict[str, Any]]]] = {}


class ModernizeRequest(BaseModel):
    project_name: str = "question"


class ReviewDecisionRequest(BaseModel):
    project_name: str
    symbol_id: str
    decision: str  # approve_retirement, confirm_critical_rule, re_investigate
    notes: str = ""


MEMORY_TOPICS = (
    "project_context",
    "discovered_components",
    "investigation_progress",
    "evidence_references",
)


def _read_markdown_directory(directory: Any) -> dict[str, str]:
    if not directory.is_dir():
        return {}
    return {
        file.stem: file.read_text(encoding="utf-8")
        for file in sorted(directory.glob("*.md"))
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": settings.service_version,
        "llm_model": settings.llm_model,
        "langfuse_enabled": settings.langfuse_enabled,
    }


@observe(name="modernization-run", as_type="agent", capture_input=False, capture_output=False)
async def _run_pipeline(project_name: str):
    ACTIVE_RUNS[project_name] = {"status": "running", "stage": "facts"}
    try:
        await _publish_run_event(project_name, {"status": "running", "stage": "facts"})
        orchestrator = AsyncModernizationOrchestrator(project_name=project_name)
        result = await orchestrator.run_all()
        update_current_span(
            output=result,
            metadata={"feature": "modernization", "project_name": project_name},
        )
        ACTIVE_RUNS[project_name] = {"status": "completed", "result": result}
        await _publish_run_event(project_name, {"status": "completed", "result": result})
    except Exception as exc:
        ACTIVE_RUNS[project_name] = {"status": "failed", "error": str(exc)}
        await _publish_run_event(project_name, {"status": "failed", "error": str(exc)})
    finally:
        flush()


async def _publish_run_event(project_name: str, event: dict[str, Any]) -> None:
    for queue in list(RUN_STREAMS.get(project_name, set())):
        await queue.put(event)


async def _run_event_stream(project_name: str):
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    RUN_STREAMS.setdefault(project_name, set()).add(queue)
    try:
        yield f"data: {json.dumps(ACTIVE_RUNS.get(project_name, {'status': 'idle'}), default=str)}\n\n"
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event, default=str)}\n\n"
            if event.get("status") in {"completed", "failed"}:
                break
    finally:
        RUN_STREAMS.get(project_name, set()).discard(queue)


@app.post("/api/v1/modernize/start")
async def start_modernization(req: ModernizeRequest, background_tasks: BackgroundTasks):
    """Start an autonomous modernization run in the background."""
    if ACTIVE_RUNS.get(req.project_name, {}).get("status") == "running":
        return {"status": "already_running", "project": req.project_name}

    ACTIVE_RUNS[req.project_name] = {"status": "starting", "stage": "initializing"}
    await _publish_run_event(req.project_name, ACTIVE_RUNS[req.project_name])
    background_tasks.add_task(_run_pipeline, req.project_name)
    return {
        "status": "started",
        "project": req.project_name,
        "message": f"Autonomous modernization running asynchronously for {req.project_name}",
    }


@app.get("/api/v1/modernize/stream/{project_name}")
async def stream_modernization(project_name: str):
    """Stream modernization status events to clients using Server-Sent Events."""
    return StreamingResponse(
        _run_event_stream(project_name),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/v1/observability/status")
async def get_observability_status():
    """Return Langfuse connectivity and configuration status."""
    conn = check_langfuse_connection()
    return {
        "service": settings.service_name,
        "langfuse_enabled": settings.langfuse_enabled,
        "connection": conn,
    }


@app.post("/api/v1/observability/test-trace")
async def trigger_test_trace(project_name: str = "question"):
    """Trigger an instrumented test trace to Langfuse and return the dashboard URL."""
    client = get_langfuse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Langfuse client not available")

    from langfuse import observe, propagate_attributes
    from app.core.observability import observe_agent, observe_tool, observe_generation

    @observe(name=f"test-trace:{project_name}", as_type="agent")
    def _execute():
        with propagate_attributes(
            session_id=project_name,
            tags=["observability-test", "groq", "crewai"],
            metadata={"project": project_name, "test": True},
        ):
            with observe_agent("TestAgent", input_data={"ping": "pong"}) as ag:
                with observe_tool("test_tool", input_data={"arg": 123}) as tl:
                    if tl:
                        tl.update(output={"result": "ok"})
                with observe_generation("test_llm", input_data={"prompt": "hello"}, model="groq/llama-3.1-8b-instant") as gn:
                    if gn:
                        gn.update(output="verified", usage_details={"input": 10, "output": 5, "total": 15})
                if ag:
                    ag.update(output={"status": "verified"})
            return {"status": "success", "trace_id": client.get_current_trace_id()}

    res = _execute()
    flush_langfuse()
    trace_url = client.get_trace_url()
    return {
        "status": "trace_sent",
        "result": res,
        "trace_url": trace_url,
    }


@app.get("/api/v1/observability/metrics")
async def get_observability_metrics():
    """Return in-process token and call aggregates grouped by agent and tool."""
    return {"metrics": metrics_snapshot()}


@app.get("/api/v1/modernize/status/{project_name}")
async def get_status(project_name: str):
    """Check modernization status, file read coverage, and tasks progress."""
    try:
        ws = open_workspace(project_name)
        store = ws.store()
        coverage = store.get_read_coverage()
        tasks = store.query("SELECT key, agent, phase, status, error FROM tasks")
        active = ACTIVE_RUNS.get(project_name, {"status": "idle"})
        return {
            "project": project_name,
            "run_state": active,
            "read_coverage_ratio": round(coverage, 3),
            "gate1_passed": coverage >= 0.60,
            "tasks_count": len(tasks),
            "tasks": tasks,
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.get("/api/v1/modernize/artifacts/{project_name}")
async def get_analysis_artifacts(project_name: str):
    """Return generated memory files and recommendation documents for the UI."""
    try:
        ws = open_workspace(project_name)
        memories = {
            topic: (ws.memory_dir / f"{topic}.md").read_text(encoding="utf-8")
            for topic in MEMORY_TOPICS
            if (ws.memory_dir / f"{topic}.md").is_file()
        }
        deliverables = _read_markdown_directory(ws.final_dir)
        recommendation = deliverables.get("modernization_recommendations", "")
        suggestions = [
            line.lstrip("-* ").strip()
            for line in recommendation.splitlines()
            if line.lstrip().startswith(("-", "*"))
        ]
        return {
            "project": project_name,
            "run_state": ACTIVE_RUNS.get(project_name, {"status": "idle"}),
            "memories": memories,
            "suggestions": suggestions[:30],
            "deliverables": deliverables,
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v1/modernize/review-queue/{project_name}")
async def get_review_queue(project_name: str):
    """Retrieve items waiting at the Human Review Gate."""
    try:
        ws = open_workspace(project_name)
        store = ws.store()
        verdicts = store.query("SELECT * FROM verdicts")
        reviews = store.query("SELECT * FROM reviews")
        return {
            "project": project_name,
            "pending_verdicts_count": len(verdicts),
            "verdicts": verdicts,
            "decisions_recorded": reviews,
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.post("/api/v1/modernize/review-decision")
async def record_review_decision(req: ReviewDecisionRequest):
    """Submit a human decision for a symbol or rule in the review queue."""
    try:
        ws = open_workspace(req.project_name)
        store = ws.store()
        store.execute(
            "INSERT OR REPLACE INTO reviews (id, item_kind, item_id, question, decision, note, decided_by, decided_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (f"rev-{req.symbol_id}", "symbol", req.symbol_id, "Human Review Gate", req.decision, req.notes, "human_reviewer", 0.0),
        )
        return {"status": "recorded", "decision": req.decision, "symbol": req.symbol_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/v1/modernize/deliverables/{project_name}")
async def get_deliverables(project_name: str):
    """List and inspect generated architectural deliverables."""
    try:
        ws = open_workspace(project_name)
        files = {}
        if ws.final_dir.is_dir():
            for f in sorted(ws.final_dir.glob("*.md")):
                files[f.name] = f.read_text(encoding="utf-8")
        return {
            "project": project_name,
            "deliverables_count": len(files),
            "deliverables": files,
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.post("/api/v1/modernize/knowledge-graph/{project_name}")
async def build_knowledge_graph_endpoint(project_name: str):
    """Generate or refresh the Obsidian Knowledge Graph vault for a project."""
    try:
        from app.modernizer.knowledge import generate_knowledge_graph
        summary = generate_knowledge_graph(project_name=project_name)
        return {"status": "success", "summary": summary}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
