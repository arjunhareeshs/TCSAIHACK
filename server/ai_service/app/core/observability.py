"""Langfuse tracing, token accounting, and run-event observability."""

from __future__ import annotations

import contextvars
import json
import logging
import re
import time
from collections import defaultdict
from contextlib import contextmanager
from threading import Lock
from typing import Any, Iterator

from langfuse import observe

from app.core.langfuse_config import ensure_langfuse_env, get_langfuse_client

# Ensure Langfuse env variables are exported before any observation runs
ensure_langfuse_env()

logger = logging.getLogger(__name__)
_current_agent: contextvars.ContextVar[str] = contextvars.ContextVar("current_agent", default="unknown")
_metrics_lock = Lock()
_metrics: dict[str, dict[str, int]] = defaultdict(lambda: {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "calls": 0})
_SECRET_PATTERN = re.compile(r"(?i)(api[_-]?key|secret|token|password|authorization)(\s*[:=]\s*)([^,\s]+)")


def _safe(value: Any, limit: int = 4_000) -> Any:
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return _SECRET_PATTERN.sub(r"\1\2[REDACTED]", value[:limit])
    if isinstance(value, dict):
        return {str(key): _safe(item) for key, item in list(value.items())[:50]}
    if isinstance(value, (list, tuple)):
        return [_safe(item) for item in value[:50]]
    return _safe(str(value), limit)


def _estimate_tokens(value: Any) -> int:
    return max(1, len(json.dumps(_safe(value), default=str)) // 4)


def _record(kind: str, name: str, usage: dict[str, int]) -> None:
    key = f"{kind}:{name}"
    with _metrics_lock:
        item = _metrics[key]
        item["input_tokens"] += usage.get("input", 0)
        item["output_tokens"] += usage.get("output", 0)
        item["total_tokens"] += usage.get("total", 0)
        item["calls"] += 1


def record_tool_output(name: str, output: Any) -> None:
    """Add the bounded output-token estimate to the current tool aggregate."""
    usage = _estimate_tokens(output)
    with _metrics_lock:
        item = _metrics[f"tool:{name}"]
        item["output_tokens"] += usage
        item["total_tokens"] += usage


def normalize_usage(value: Any) -> dict[str, int]:
    """Normalize provider/CrewAI token fields for Langfuse and metrics."""
    if value is None:
        return {"input": 0, "output": 0, "total": 0}
    source = value if isinstance(value, dict) else vars(value)
    input_tokens = int(source.get("input", source.get("prompt_tokens", source.get("input_tokens", 0))) or 0)
    output_tokens = int(source.get("output", source.get("completion_tokens", source.get("output_tokens", 0))) or 0)
    total = int(source.get("total", source.get("total_tokens", input_tokens + output_tokens)) or 0)
    return {"input": input_tokens, "output": output_tokens, "total": total}


def usage_from_result(result: Any) -> dict[str, int]:
    return normalize_usage(getattr(result, "token_usage", None) or getattr(result, "usage", None))


@contextmanager
def observe_run(name: str, input_data: Any, metadata: dict[str, Any] | None = None) -> Iterator[Any]:
    """Create the root agent observation for one user-visible run."""
    client = get_langfuse_client()
    if client is None:
        yield None
        return
    with client.start_as_current_observation(
        as_type="agent",
        name=name,
        input=_safe(input_data),
        metadata=_safe(metadata or {}),
    ) as observation:
        try:
            yield observation
        except Exception as exc:
            observation.update(level="ERROR", status_message=str(exc))
            raise


@contextmanager
def observe_agent(name: str, input_data: Any, metadata: dict[str, Any] | None = None) -> Iterator[Any]:
    """Create a nested agent observation and set the per-agent metric scope."""
    token = _current_agent.set(name)
    client = get_langfuse_client()
    try:
        if client is None:
            yield None
            return
        with client.start_as_current_observation(
            as_type="agent",
            name=name,
            input=_safe(input_data),
            metadata=_safe(metadata or {}),
        ) as observation:
            yield observation
    except Exception as exc:
        if client is not None:
            logger.exception("Langfuse agent observation failed for %s", name)
        raise
    finally:
        _current_agent.reset(token)


@contextmanager
def agent_scope(name: str) -> Iterator[None]:
    """Set the current agent for metrics while its decorated observation runs."""
    token = _current_agent.set(name)
    try:
        yield
    finally:
        _current_agent.reset(token)


@contextmanager
def observe_tool(name: str, input_data: Any) -> Iterator[Any]:
    """Trace one tool call and account for bounded input/output token estimates."""
    started = time.monotonic()
    client = get_langfuse_client()
    observation_context = (
        client.start_as_current_observation(
            as_type="tool",
            name=name,
            input=_safe(input_data),
            metadata={"agent": _current_agent.get()},
        )
        if client is not None
        else None
    )
    try:
        if observation_context is None:
            yield None
        else:
            with observation_context as observation:
                yield observation
    except Exception as exc:
        if client is not None:
            logger.warning("Tool %s failed: %s", name, exc)
        raise
    finally:
        _record("tool", name, {"input": _estimate_tokens(input_data), "output": 0, "total": _estimate_tokens(input_data)})
        logger.debug("Tool %s completed in %.0fms", name, (time.monotonic() - started) * 1000)


@contextmanager
def observe_generation(name: str, input_data: Any, model: str | None = None) -> Iterator[Any]:
    """Create a generation observation whose usage can be updated after completion."""
    client = get_langfuse_client()
    if client is None:
        yield None
        return
    with client.start_as_current_observation(
        as_type="generation",
        name=name,
        model=model,
        input=_safe(input_data),
    ) as observation:
        yield observation


def record_generation(agent: str, result: Any, model: str | None = None) -> dict[str, int]:
    """Record CrewAI/provider usage in the per-agent aggregate."""
    usage = usage_from_result(result)
    _record("agent", agent, usage)
    if model:
        logger.debug("Agent %s used model %s: %s", agent, model, usage)
    return usage


def metrics_snapshot() -> dict[str, dict[str, int]]:
    with _metrics_lock:
        return {key: dict(value) for key, value in _metrics.items()}


def flush() -> None:
    client = get_langfuse_client()
    if client is not None:
        client.flush()


def update_current_span(**kwargs: Any) -> None:
    """Update a decorator-created span only when one is active."""
    client = get_langfuse_client()
    if client is None or client.get_current_observation_id() is None:
        return
    client.update_current_span(**kwargs)


def update_current_generation(**kwargs: Any) -> None:
    """Update a decorator-created generation only when one is active."""
    client = get_langfuse_client()
    if client is None or client.get_current_observation_id() is None:
        return
    client.update_current_generation(**kwargs)


@observe(name="crew-generation", as_type="generation", capture_input=False, capture_output=False)
async def execute_generation(crew_instance: Any, inputs: dict[str, Any]) -> tuple[Any, dict[str, int]]:
    """Execute a CrewAI kickoff inside a Langfuse generation observation."""
    result = await crew_instance.kickoff_async(inputs=inputs)
    usage = usage_from_result(result)
    update_current_generation(
        output=str(result)[:4_000],
        usage_details={
            "input": usage["input"],
            "output": usage["output"],
            "total": usage["total"],
        },
        metadata={"agent": _current_agent.get()},
    )
    return result, usage
