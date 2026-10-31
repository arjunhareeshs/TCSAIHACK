# System Architecture & Observability

This application implements production-grade LLM observability using [Langfuse](https://langfuse.com), adhering to the Langfuse Observability Skill best practices.

## Observability Architecture

```
                    ┌──────────────────────────────────┐
                    │       FastAPI API Router         │
                    │   (/api/chat, /api/rag/query)    │
                    └─────────────────┬────────────────┘
                                      │
              ┌───────────────────────┴────────────────────────┐
              │                                                │
              ▼                                                ▼
┌───────────────────────────┐                    ┌───────────────────────────┐
│     KnowledgeRetriever    │                    │         LLMClient         │
│  @observe(as_type=        │                    │   @observe(as_type=       │
│    "retriever")           │                    │     "generation")         │
└─────────────┬─────────────┘                    └─────────────┬─────────────┘
              │                                                │
              └───────────────────────┬────────────────────────┘
                                      ▼
                        ┌───────────────────────────┐
                        │      Langfuse Client      │
                        │ (Buffered Async Exporter) │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   Langfuse Server (SaaS   │
                        │    or Self-Hosted)        │
                        └───────────────────────────┘
```

## Tracing Best Practices Implemented

1. **Environment Initialization Order**:
   - Environment variables are loaded before any Langfuse SDK components are imported (`python-dotenv` before `Langfuse`).
2. **Explicit Observation Typing**:
   - Generations (`@observe(as_type="generation")`) track model name, token usage (input/output/total), prompts, and completions.
   - Retrievers (`@observe(as_type="retriever")`) track document candidates, relevance scores, and query parameters.
   - Embeddings (`@observe(as_type="embedding")`) track dimension, text volume, and model name.
   - Agents (`@observe(as_type="agent")`) track workflow coordination for visualization in the Langfuse Agent Graph.
3. **Contextual Enrichment**:
   - `session_id`: Groups multi-turn chat interactions into cohesive sessions in the Langfuse Sessions view.
   - `user_id`: Enables per-user analytics, cost attribution, and usage auditing.
   - `tags`: Allows filtering by feature (`rag`, `chat`), stage (`dev`, `staging`, `prod`), and release version.
4. **Lifecycle & Flush Guarantees**:
   - FastAPI `lifespan` handler flushes buffered telemetry on shutdown (`flush_langfuse()`), preventing dropped traces.
5. **PII & Credential Sanitization**:
   - Sensitive headers, passwords, and tokens are scrubbed from telemetry payloads via `sanitize_payload`.
6. **User Feedback & Evaluations**:
   - Dedicated `/api/feedback` endpoint records explicit user signals (thumbs-up/thumbs-down, relevance ratings) to Langfuse trace IDs.
