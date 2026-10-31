# Architecture Diagram: Autonomous Legacy Modernization Agent

This replaces the earlier diagram. The Mermaid source below has not been rendered in a viewer, so check it once in your Markdown preview.

## Problems found in the original diagram

| # | Problem | Why it matters | Fixed here |
|---|---|---|---|
| 1 | All three gates sit in one box on the left, with arrows crossing the crews | The order is unreadable: Gate 1 should sit between investigation and business logic, Gate 2 after verification, Gate 3 after synthesis | Each gate sits where it happens in the flow |
| 2 | A floating `Pass` label with no source and target | A dangling edge; it reads as a mistake | Every edge has a source and a target |
| 3 | No failure paths | Gates look like they can only pass. The rework loops are the reliability story | Fail edges go back to the crew that must redo work |
| 4 | No loop from the human gate back into the system | The challenge asks how the solution adapts when evidence changes | `Adapt` node reopens only the affected findings |
| 5 | The fact layer lists only Scanner, Liveness, Indexer and Linker | Git Miner, Operational Linker and Static Debt Checks exist and feed the liveness verdicts | All seven components shown in order |
| 6 | No orchestrator | Nothing shows who schedules tasks, retries, enforces timeouts and resumes runs | `Orchestrator` node added |
| 7 | Research and Synthesis crews have no inbound or outbound edges | They look disconnected from the flow | Wired in the correct order |
| 8 | Deliverables list is partial (6 files) | The brief lists nine expected outcomes | All deliverable groups shown |
| 9 | The inference engine named two Llama models | Both return 404 on the configured Groq account, so no agent could run | Updated to `gpt-oss-120b` and `gpt-oss-20b`, which the account can use |
| 10 | Langfuse drawn as if it is connected | Tracing is not wired in the code yet | Marked as planned, dashed |

## System flow

```mermaid
flowchart TB
    subgraph IN["1. Inputs (read-only)"]
        SRC["Project folder<br/>projects/name"]
        OPS["Incidents, tickets, docs<br/>analysis/name/inputs"]
        SQL["Schema files<br/>SQL, ORM, migrations"]
    end

    subgraph FACTS["2. Deterministic fact layer (no LLM)"]
        SCAN["Repository Scanner<br/>files, layers, entry points"] --> IDX["Code Indexer<br/>Python AST, JS/TS, SQL"]
        IDX --> LINK["Connection Linker<br/>routes, API calls, imports"]
        LINK --> GIT["Git Miner<br/>commits, fix commits"]
        GIT --> OPL["Operational Linker<br/>records to files and symbols"]
        OPL --> LIVE["Liveness Engine<br/>usage and criticality signals"]
        LIVE --> STAT["Static Debt Checks<br/>cycles, secrets, unpinned deps"]
    end

    EV[("3. Evidence store<br/>evidence.db and Markdown<br/>citations, findings, verdicts, tasks")]
    ORCH{{"Orchestrator<br/>async, concurrency limit, retries,<br/>timeouts, cancel, resume"}}
    LLM["Groq<br/>gpt-oss-120b, gpt-oss-20b"]
    LF["Langfuse tracing<br/>planned, not wired"]

    subgraph INV["4. Investigation crew (parallel)"]
        A1["A1 Frontend"]
        A2["A2 Backend"]
        A3["A3 Database"]
        A4["A4 Deployment"]
        A5["A5 Stack and config"]
        A6["A6 Operational evidence"]
    end
    G1{"Gate 1<br/>coverage 60 percent or more<br/>valid citations"}

    subgraph BIZ["5. Business logic crew"]
        A7["A7 Rule extractor<br/>10-field rules"] --> A8["A8 Obsolescence adjudicator<br/>disproof checks enforced"]
    end

    subgraph RES["6. Research crew (external, labelled)"]
        R1["R1 Technology"]
        R2["R2 Security"]
        R3["R3 Architecture"]
    end

    S1["7. Supervisor<br/>verifies, never writes the architecture"]
    G2{"Gate 2<br/>consistency and citations"}

    subgraph SYN["8. Synthesis crew"]
        W1["W1 Current state"]
        W2["W2 Target and options"]
        W3["W3 Roadmap and tests"]
    end
    G3{"Gate 3<br/>deliverables complete"}
    HUM["9. Human review gate<br/>review_queue.md<br/>retirements, rules, open questions"]
    OUT["10. Final deliverables"]
    ADAPT["Adapt<br/>new evidence reopens only<br/>affected findings and verdicts"]
    NEW["New incident,<br/>code change or reviewer decision"]

    IN --> FACTS
    FACTS --> EV
    ORCH -->|launches| INV
    ORCH -->|launches| BIZ
    ORCH -->|launches| RES
    ORCH -->|launches| SYN
    EV <-->|guarded tools| INV
    EV <-->|guarded tools| BIZ
    INV --> G1
    G1 -->|fail: unread files| INV
    G1 -->|pass| BIZ
    G1 -->|pass| RES
    BIZ --> S1
    RES --> S1
    S1 --> G2
    G2 -->|fail: targeted rework, limited rounds| INV
    G2 -->|unresolved after limit: flag for human| HUM
    G2 -->|pass| SYN
    SYN --> G3
    G3 -->|fail: fix named gaps| SYN
    G3 -->|pass| HUM
    HUM -->|approve| OUT
    HUM -->|correction| ADAPT
    NEW --> ADAPT
    ADAPT --> EV
    ADAPT --> S1
    INV -.inference.-> LLM
    BIZ -.inference.-> LLM
    SYN -.inference.-> LLM
    ORCH -.traces.-> LF
```

## Deliverables

```mermaid
flowchart LR
    EV[("Evidence store")] --> D1["Current state<br/>executive_summary<br/>current_architecture<br/>architecture_diagram"]
    EV --> D2["Business rules<br/>business_rule_catalogue"]
    EV --> D3["Dependencies<br/>dependency_map"]
    EV --> D4["Risk<br/>modernization_heatmap<br/>technical_debt<br/>problem_catalogue<br/>security_assessment"]
    EV --> D5["Target<br/>target_architecture<br/>migration_options<br/>modernization_recommendations"]
    EV --> D6["Plan<br/>migration_roadmap<br/>testing_and_regression_strategy"]
    EV --> D7["Human decisions<br/>review_queue"]
```

## How one code symbol is judged (the critical requirement)

```mermaid
flowchart TD
    S["Symbol that looks unused"] --> A{"Production caller or<br/>framework registration?"}
    A -->|yes| B{"Business-rule shape<br/>and undocumented?"}
    B -->|yes| R1["LIVE_UNDOCUMENTED_RULE<br/>protect, add characterization test"]
    B -->|no| R2["LIVE"]
    A -->|no| C{"Incident, ticket or<br/>bug-fix history?"}
    C -->|yes| R3["HIDDEN_CRITICAL<br/>protect, human confirms"]
    C -->|no| D{"Config, string, schedule or<br/>side-effect import reference?"}
    D -->|yes, rule-shaped| R3
    D -->|yes, plumbing| R4["LIVE_INDIRECT<br/>document the trigger"]
    D -->|no| E{"Rule-shaped or<br/>writes data?"}
    E -->|yes| R5["NEEDS_HUMAN"]
    E -->|no| R6["OBSOLETE_CANDIDATE<br/>monitored retirement, never deletion"]
    R6 --> ADJ["A8 tries to disprove:<br/>5 tool checks enforced by code"]
    R5 --> ADJ
    ADJ -->|cannot downgrade protected code| HUM["Human review"]
```

Age, old technology and low commit activity carry no weight in this decision.
