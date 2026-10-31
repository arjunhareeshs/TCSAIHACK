# Langfuse AI Observability & Tracing Guide

This project is instrumented with [Langfuse](https://langfuse.com) following best practices established by the official **Langfuse AI Skill** (`github.com/langfuse/skills`).

---

## 1. Skill Installation

The Langfuse skill has been installed into:
- **Global Skill Directory**: `~/.gemini/config/skills/langfuse`
- **Workspace Project Directory**: `.agents/skills/langfuse`

The skill provides guidelines, prompts, API schemas, and best-practice playbooks for tracing, prompt engineering, evaluations, and dataset creation.

---

## 2. Best Practices Checklist Implemented

| Requirement | Implementation Detail | Status |
| :--- | :--- | :---: |
| **Early Environment Loading** | `python-dotenv` loads environment variables *before* any Langfuse SDK initialization. | Verified |
| **Observation Typing (`as_type`)** | Granular types applied: `generation` (LLMs), `retriever` (document fetch), `embedding` (vector encoding), `agent` (pipeline orchestrator). | Verified |
| **Session Tracking** | `session_id` attached to chat & RAG traces to group multi-turn conversations in the Langfuse Sessions view. | Verified |
| **User Attribution** | `user_id` tracked on all queries for per-user cost tracking and performance analysis. | Verified |
| **Tags & Metadata** | Traces tagged with feature categories (`rag`, `chat`) and environment (`development`, `production`). | Verified |
| **Lifecycle Flush** | FastAPI `lifespan` handler flushes buffered traces (`flush_langfuse()`) on shutdown, preventing dropped events. | Verified |
| **Sensitive Data Sanitization** | `sanitize_payload()` redacts sensitive parameters (passwords, tokens, API keys) before ingestion. | Verified |
| **Feedback & Evaluations** | `/api/feedback` endpoint records explicit evaluation scores (thumbs-up/down, 1-5 ratings) to trace IDs. | Verified |
| **Zero-Downtime Fallback** | Application functions seamlessly without errors if Langfuse credentials are not provided. | Verified |

---

## 3. Configuration

Configure your environment in `server/.env` (see `server/.env.example`):

```bash
# Langfuse API Credentials
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# Cloud Hosts:
# EU Cloud: https://cloud.langfuse.com
# US Cloud: https://us.cloud.langfuse.com
# Self-hosted: http://localhost:3000
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_RELEASE=v1.0.0
LANGFUSE_ENABLED=true
```

> **Note**: Project API keys can be generated in your Langfuse Project under **Settings -> API Keys**. If you don't have an account, create one at [langfuse.com/cloud](https://langfuse.com/cloud).

---

## 4. Architecture & Components

```
server/ai_service/
├── app/
│   ├── api/
│   │   └── routes.py              # FastAPI endpoints (/chat, /rag/query, /embeddings, /feedback)
│   ├── core/
│   │   ├── config.py              # Environment configuration & dotenv pre-loading
│   │   ├── logging.py             # Structured logger
│   │   └── tracing.py             # Langfuse client lifecycle, flush, and feedback utils
│   ├── embeddings/
│   │   └── generator.py           # @observe(as_type="embedding")
│   ├── inference/
│   │   └── llm_client.py          # @observe(as_type="generation") with token metrics
│   ├── pipelines/
│   │   └── rag_pipeline.py        # @observe(as_type="agent") orchestrating retrieval & generation
│   ├── rag/
│   │   └── retriever.py           # @observe(as_type="retriever") with doc relevance scores
│   └── main.py                    # FastAPI application with lifespan flush handlers
├── run_e2e_traces.py              # E2E test verification script
└── tests/
    └── test_inference.py          # Pytest suite
```

---

## 5. Running Traces & Verifying in Langfuse

### Run End-to-End Traces
Execute the verification script to generate sample traces across all observation types:

```bash
cd server/ai_service
python run_e2e_traces.py
```

### Inspect Traces in the Langfuse UI
1. **Traces View**: Open `https://cloud.langfuse.com` -> Project -> **Traces**.
2. **Agent Graph**: Click on the `rag-query` trace to inspect the hierarchical tree:
   - `rag-pipeline-orchestrator` (agent)
     - `retrieve-documents` (retriever span with candidates & overlap scores)
     - `llm-generation` (generation node with input/output tokens and model parameters)
3. **Sessions View**: Filter by `session_id="eval-session-001"` to see grouped conversational history.
4. **Scores View**: Verify that user feedback (`user_helpfulness = 1.0`) is attached directly to the trace.

