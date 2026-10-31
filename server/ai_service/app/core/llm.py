"""LLM factory and configuration for CrewAI agents, optimized for Groq."""

from __future__ import annotations

import logging
import os
from typing import Any
from crewai.llm import LLM
from app.core.config import settings

logger = logging.getLogger(__name__)


def _groq_model(model_type: str) -> str:
    configured = (
        os.getenv("MOD_LLM_FAST_MODEL")
        if model_type == "fast"
        else os.getenv("MOD_LLM_MODEL")
    )
    model = configured or (
        "groq/openai/gpt-oss-20b"
        if model_type == "fast"
        else "groq/openai/gpt-oss-120b"
    )
    model = model.removeprefix("groq/").removeprefix("openai/")
    return f"openai/{model}"


def get_llm(model_type: str = "default") -> LLM:
    """Return a configured CrewAI LLM instance based on available environment variables.

    Prioritizes Groq (ultra-fast inference with native OpenAI-compatible interface).
    """
    groq_key = settings.groq_api_key or os.getenv("GROQ_API_KEY")
    anthropic_key = settings.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
    openai_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    gemini_key = settings.gemini_api_key or settings.google_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    # Priority 1: Groq (ultra fast inference)
    if groq_key:
        os.environ["GROQ_API_KEY"] = groq_key
        # Groq exposes these models through its OpenAI-compatible API.
        groq_model = _groq_model("default" if model_type not in ("deep", "reasoning") else "deep")

        return LLM(
            model=groq_model,
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_key,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )

    model_name = settings.llm_fast_model if model_type == "fast" else settings.llm_model
    api_key: str | None = None

    if "anthropic" in model_name or "claude" in model_name:
        api_key = anthropic_key
        if not api_key:
            if openai_key:
                logger.warning("Anthropic key not found, falling back to OpenAI gpt-4o")
                model_name = "gpt-4o-mini" if model_type == "fast" else "gpt-4o"
                api_key = openai_key
            elif gemini_key:
                logger.warning("Anthropic key not found, falling back to Google Gemini")
                model_name = "gemini/gemini-2.5-flash" if model_type == "fast" else "gemini/gemini-2.5-pro"
                api_key = gemini_key
    elif "gpt" in model_name or "openai" in model_name:
        api_key = openai_key
    elif "gemini" in model_name:
        api_key = gemini_key

    if not api_key:
        api_key = os.getenv("LLM_API_KEY", "")

    return LLM(
        model=model_name,
        api_key=api_key,
        temperature=settings.llm_temperature,
    )
