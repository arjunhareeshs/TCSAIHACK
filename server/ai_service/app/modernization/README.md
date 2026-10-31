# Legacy Modernization Agent

Evidence-first reverse engineering of an existing application, built on CrewAI. See `docs/MODERNIZATION_AGENT_PLAN.md` for the design and `docs/ARCHITECTURE_DIAGRAM.md` for the flow.

## Run

From `server/ai_service`:

```bash
.venv/Scripts/python -X utf8 -m app.modernization <project> [options]
```

`<project>` is a folder name under `server/backend/projects/`. The project is only read. Output goes to `server/backend/analysis/<project>/.legacy-intelligence/`.

| Option | Effect |
|---|---|
| `--facts-only` | Deterministic layer and reports only. No LLM, about 3 seconds. |
| `--only A1,A7,A8` | Run only these agents. |
| `--reset` | Delete this project's analysis folder first (never the project). |
| `--force` | Re-run tasks already marked done. A normal re-run resumes and skips them. |
| `--concurrency N` | Agents running at once. Default 2 (Groq rate limits). |

Incidents and tickets: put JSON lists (`[{"id","kind","title","body"}]`) or one `.md`/`.txt` per record in `analysis/<project>/.legacy-intelligence/inputs/`.

## Settings (`server/.env`, `MOD_` prefix)

`MOD_LLM_MODEL`, `MOD_LLM_FAST_MODEL` (Groq models as `groq/<model id>`), `GROQ_API_KEY`, and any field of `config.Settings`, for example `MOD_MAX_CONCURRENCY`, `MOD_TASK_TIMEOUT_S`, `MOD_FILES_PER_AGENT`.

## Modules

| File | Role |
|---|---|
| `scanner.py`, `indexer.py`, `linker.py`, `liveness.py`, `pipeline.py` | Deterministic facts: inventory, symbols, routes, API calls, imports, markers, Git, records, liveness verdicts, static checks |
| `store.py`, `workspace.py` | SQLite evidence store; documents, citation gate, findings |
| `tools.py` | The 33 guarded CrewAI tools |
| `agents.py`, `llm.py` | Agent specs, task prompts, guardrails, Groq through its OpenAI-compatible endpoint |
| `planner.py` | Dynamic partitions so every file has one owner |
| `orchestrator.py` | Phases, concurrency, retries, timeouts, cancel, resume, gates |
| `reports.py` | Heat map, rule catalogue, dependency map, review queue and the other generated deliverables |

## Tests

```bash
OTEL_SDK_DISABLED=true .venv/Scripts/python -X utf8 -m pytest tests/test_modernization.py
```

Covers the seeded-trap verdicts, citation gate, safety rules, planner, retries, timeouts, cancel, resume and concurrency. No LLM or network is needed.

## Known limits

- Reference matching is name-based. Common names can create false references; external callers are invisible. Verdicts stay conservative and end with a human.
- Python is parsed with `ast`. JS/TS uses patterns plus bracket matching. Other languages are inventoried but not indexed.
- Live database inspection is not implemented. Schemas are read from SQL and ORM files.
- Langfuse tracing is not wired. Tool calls are audited in the `tool_audit` table instead.
- Web search is not implemented. Research uses the OSV vulnerability database and PyPI/npm registries.
