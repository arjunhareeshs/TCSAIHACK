# Dependency and Relationship Map

## Frontend to backend (request flow)

```mermaid
flowchart LR
  F0["ActivityLog.tsx:177"] --> B0["GET /api/activity/{job_id}/logs<br/>get_activity_logs"]
  F1["apiService.ts:52"] --> B1["POST /api/ingest<br/>ingest_pdf"]
  F2["apiService.ts:63"] --> B2["POST /api/generate/images<br/>generate_images"]
  F3["apiService.ts:77"] --> B3["GET /api/generate/{job_id}/status<br/>get_job_status"]
  F4["apiService.ts:122"] --> B4["GET /api/generate/{job_id}/result<br/>get_job_result"]
  F5["apiService.ts:130"] --> B5["POST /api/generate/full-bank<br/>generate_full_question_bank"]
  F6["apiService.ts:169"] --> B6["POST /api/generate/divide-unit<br/>divide_unit_syllabus"]
  F7["apiService.ts:181"] --> B7["POST /api/generate/refine<br/>refine_question"]
  F8["apiService.ts:205"] --> B8["POST /api/feedback/submit<br/>submit_feedback"]
  F9["apiService.ts:242"] --> B9["POST /api/generate/clear<br/>clear_jobs"]
```

| Frontend call | Backend route | Handler | Evidence |
|---|---|---|---|
| GET `/activity/{}/logs` | `/api/activity/{job_id}/logs` | get_activity_logs | client/components/ActivityLog.tsx:177 |
| POST `/api/ingest` | `/api/ingest` | ingest_pdf | client/services/apiService.ts:52 |
| POST `/api/generate/images` | `/api/generate/images` | generate_images | client/services/apiService.ts:63 |
| GET `/api/generate/{}/status` | `/api/generate/{job_id}/status` | get_job_status | client/services/apiService.ts:77 |
| GET `/api/generate/{}/result` | `/api/generate/{job_id}/result` | get_job_result | client/services/apiService.ts:122 |
| POST `/api/generate/full-bank` | `/api/generate/full-bank` | generate_full_question_bank | client/services/apiService.ts:130 |
| POST `/api/generate/divide-unit` | `/api/generate/divide-unit` | divide_unit_syllabus | client/services/apiService.ts:169 |
| POST `/api/generate/refine` | `/api/generate/refine` | refine_question | client/services/apiService.ts:181 |
| POST `/api/feedback/submit` | `/api/feedback/submit` | submit_feedback | client/services/apiService.ts:205 |
| POST `/api/generate/clear` | `/api/generate/clear` | clear_jobs | client/services/apiService.ts:242 |

## Module dependencies (resolved project-internal imports)

```mermaid
flowchart LR
  M6["server/app/engine"] -->|40| M7["server/app/models"]
  M6["server/app/engine"] -->|39| M5["server/app/core"]
  M8["server/app/services"] -->|21| M6["server/app/engine"]
  M8["server/app/services"] -->|19| M7["server/app/models"]
  M4["server/app/api"] -->|17| M7["server/app/models"]
  M3["server/app"] -->|16| M4["server/app/api"]
  M4["server/app/api"] -->|13| M5["server/app/core"]
  M4["server/app/api"] -->|12| M8["server/app/services"]
  M8["server/app/services"] -->|11| M5["server/app/core"]
  M6["server/app/engine"] -->|9| M8["server/app/services"]
  M0["client"] -->|8| M1["client/components"]
  M1["client/components"] -->|4| M0["client"]
  M3["server/app"] -->|3| M5["server/app/core"]
  M2["client/services"] -->|2| M0["client"]
  M9["server/app/utils"] -->|2| M5["server/app/core"]
  M0["client"] -->|1| M2["client/services"]
  M1["client/components"] -->|1| M2["client/services"]
  M3["server/app"] -->|1| M7["server/app/models"]
  M3["server/app"] -->|1| M8["server/app/services"]
  M4["server/app/api"] -->|1| M6["server/app/engine"]
```

## Circular dependencies

None found among resolved imports.

## Database objects found in files

None. The application may use a schemaless store or an external database; see database.md.

> Import and call links are name-based and heuristic. Verified claims about them are in the layer documents with citations.
