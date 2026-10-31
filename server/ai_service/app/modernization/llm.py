"""LLM factory. Groq is used through its OpenAI-compatible endpoint (CrewAI has no native Groq provider)."""
import os

from crewai import LLM

GROQ_BASE = "https://api.groq.com/openai/v1"


def make_llm(model: str, max_tokens: int = 2048) -> LLM:
    if model.startswith("groq/"):
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY is not set in server/.env")
        model_id = model.removeprefix("groq/").removeprefix("openai/")
        return LLM(model="openai/" + model_id, base_url=GROQ_BASE, api_key=key,
                   temperature=0.1, max_tokens=max_tokens, timeout=120)
    return LLM(model=model, temperature=0.1, max_tokens=max_tokens, timeout=120)
