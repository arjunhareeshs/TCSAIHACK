"""Registry for the tools available to CrewAI agents."""

from __future__ import annotations

from collections.abc import Iterable
from threading import RLock
from typing import Any


class ToolRegistry:
    """Thread-safe named registry for CrewAI tool objects."""

    def __init__(self) -> None:
        self._tools: dict[str, Any] = {}
        self._lock = RLock()

    def register(self, tool: Any) -> Any:
        name = getattr(tool, "name", None)
        if not isinstance(name, str) or not name.strip():
            raise ValueError("A CrewAI tool must expose a non-empty name")
        with self._lock:
            if name in self._tools:
                raise ValueError(f"Tool already registered: {name}")
            self._tools[name] = tool
        return tool

    def get(self, name: str) -> Any:
        with self._lock:
            try:
                return self._tools[name]
            except KeyError as exc:
                raise KeyError(f"Unknown tool: {name}") from exc

    def all(self) -> tuple[Any, ...]:
        with self._lock:
            return tuple(self._tools.values())

    def select(self, names: Iterable[str] | None = None) -> list[Any]:
        if names is None:
            return list(self.all())
        return [self.get(name) for name in names]


_registry = ToolRegistry()


def get_tool_registry() -> ToolRegistry:
    """Return the process-wide registry used by agent factories."""

    return _registry
