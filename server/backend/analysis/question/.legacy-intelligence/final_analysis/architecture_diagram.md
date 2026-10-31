# Architecture Diagram (generated from the index)

```mermaid
flowchart TB
  subgraph FE["Frontend: 14 files"]
    FEA[UI components and services]
  end
  subgraph BE["Backend: 73 files"]
    BEA["23 routes, services, engine"]
  end
  FE -->|"10 matched API calls"| BE
```

Entry points: `client/index.html`, `client/index.tsx`, `server/run.py`, `server/app/main.py`, `server/utils/extract_docx_fast.py`

> Generated from deterministic facts. current_architecture.md adds the agent-verified detail.
