from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


class AIServiceError(RuntimeError):
    """Raised when the AI service cannot complete a backend request."""


async def request_ai(
    method: str,
    path: str,
    *,
    json: dict[str, Any] | None = None,
) -> Any:
    try:
        async with httpx.AsyncClient(
            base_url=settings.ai_service_url.rstrip("/"),
            timeout=httpx.Timeout(10.0, connect=2.0),
        ) as client:
            response = await client.request(method, path, json=json)
    except httpx.HTTPError as exc:
        raise AIServiceError("AI service is unavailable.") from exc

    if response.is_error:
        detail = response.text[:500] or "AI service request failed."
        raise AIServiceError(detail)
    return response.json()
