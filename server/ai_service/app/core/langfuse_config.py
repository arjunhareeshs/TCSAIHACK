"""Langfuse client configuration for observability."""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any
from app.core.config import settings

logger = logging.getLogger(__name__)


def ensure_langfuse_env() -> None:
    """Ensure Langfuse environment variables are populated for global SDK usage."""
    if settings.langfuse_public_key and "LANGFUSE_PUBLIC_KEY" not in os.environ:
        os.environ["LANGFUSE_PUBLIC_KEY"] = settings.langfuse_public_key
    if settings.langfuse_secret_key and "LANGFUSE_SECRET_KEY" not in os.environ:
        os.environ["LANGFUSE_SECRET_KEY"] = settings.langfuse_secret_key
    if settings.langfuse_base_url:
        if "LANGFUSE_BASE_URL" not in os.environ:
            os.environ["LANGFUSE_BASE_URL"] = settings.langfuse_base_url
        if "LANGFUSE_HOST" not in os.environ:
            os.environ["LANGFUSE_HOST"] = settings.langfuse_base_url


@lru_cache(maxsize=1)
def get_langfuse_client() -> Any | None:
    """Return Langfuse client if configured, else None."""
    if not settings.langfuse_enabled:
        return None

    ensure_langfuse_env()

    public_key = settings.langfuse_public_key or os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = settings.langfuse_secret_key or os.getenv("LANGFUSE_SECRET_KEY")
    base_url = settings.langfuse_base_url or os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")

    if not public_key or not secret_key:
        logger.debug("Langfuse keys not set; tracing disabled.")
        return None

    try:
        from langfuse import Langfuse
        client = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            base_url=base_url,
            environment=os.getenv("LANGFUSE_ENVIRONMENT", settings.service_name),
            release=os.getenv("LANGFUSE_RELEASE", settings.service_version),
            sample_rate=float(os.getenv("LANGFUSE_SAMPLE_RATE", "1.0")),
        )
        logger.info("Langfuse client initialized successfully against %s", base_url)
        return client
    except Exception as exc:
        logger.warning("Failed to initialize Langfuse: %s", exc)
        return None


def flush_langfuse() -> None:
    """Safely flush pending observations to Langfuse Cloud."""
    client = get_langfuse_client()
    if client is not None:
        try:
            client.flush()
        except Exception as exc:
            logger.warning("Error during Langfuse flush: %s", exc)


def check_langfuse_connection() -> dict[str, Any]:
    """Test and return the authentication and connectivity status of Langfuse."""
    ensure_langfuse_env()
    client = get_langfuse_client()
    if client is None:
        return {
            "status": "disabled",
            "connected": False,
            "error": "Langfuse client could not be initialized or is disabled.",
        }

    try:
        auth_ok = client.auth_check()
        return {
            "status": "connected" if auth_ok else "unauthorized",
            "connected": bool(auth_ok),
            "base_url": settings.langfuse_base_url,
            "public_key_preview": f"{settings.langfuse_public_key[:8]}...{settings.langfuse_public_key[-4:]}" if settings.langfuse_public_key else None,
        }
    except Exception as exc:
        return {
            "status": "error",
            "connected": False,
            "error": str(exc),
        }
