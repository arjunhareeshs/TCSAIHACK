# Discovered Components

## Indexed by the deterministic layer

### Backend routes (indexed)

| Method | Route | Handler | Location |
|---|---|---|---|
| GET | `/api/activity/{job_id}/stream` | stream_activity | server/app/api/routes/activity.py:17 |
| GET | `/api/activity/{job_id}/logs` | get_activity_logs | server/app/api/routes/activity.py:60 |
| GET | `/api/activity/global` | get_global_logs | server/app/api/routes/activity.py:67 |
| POST | `/api/feedback/submit` | submit_feedback | server/app/api/routes/feedback.py:15 |
| GET | `/api/feedback/feedback/{job_id}/history` | get_feedback_history | server/app/api/routes/feedback.py:54 |
| POST | `/api/ingest` | ingest_pdf | server/app/api/routes/generation.py:19 |
| POST | `/api/generate/images` | generate_images | server/app/api/routes/generation.py:46 |
| POST | `/api/generate/clear` | clear_jobs | server/app/api/routes/generation.py:65 |
| POST | `/api/generate/refine` | refine_question | server/app/api/routes/generation.py:80 |
| GET | `/api/generate/{job_id}/status` | get_job_status | server/app/api/routes/generation.py:95 |
| GET | `/api/generate/{job_id}/result` | get_job_result | server/app/api/routes/generation.py:104 |
| GET | `/api/generate/{job_id}/text` | get_formatted_output | server/app/api/routes/generation.py:113 |
| POST | `/api/generate/full-bank` | generate_full_question_bank | server/app/api/routes/generation.py:128 |
| POST | `/api/generate/divide-unit` | divide_unit_syllabus | server/app/api/routes/generation.py:301 |
| GET | `/api/health` | health_check | server/app/api/routes/health.py:11 |
| GET | `/api/health/config` | config_info | server/app/api/routes/health.py:22 |
| POST | `/api/images/images/extract` | extract_images_from_pdf | server/app/api/routes/images.py:79 |
| POST | `/api/images/images/generate` | generate_questions_from_images | server/app/api/routes/images.py:139 |
| DELETE | `/api/images/images/session/{session_id}` | cleanup_session | server/app/api/routes/images.py:216 |
| DELETE | `/api/images/images/session/{session_id}` | cleanup_session | server/app/api/routes/images.py:243 |
| POST | `/api/pdfs/generate/{job_id}` | generate_pdfs | server/app/api/routes/pdfs.py:28 |
| GET | `/api/pdfs/download/{filename}` | download_pdf | server/app/api/routes/pdfs.py:85 |
| GET | `/` | create_app.root | server/app/main.py:133 |

### Frontend API calls

| Call | Location | Matched backend route |
|---|---|---|
| GET `/activity/{}/logs` | client/components/ActivityLog.tsx:177 | `/api/activity/{job_id}/logs` (server/app/api/routes/activity.py) |
| POST `/api/ingest` | client/services/apiService.ts:52 | `/api/ingest` (server/app/api/routes/generation.py) |
| POST `/api/generate/images` | client/services/apiService.ts:63 | `/api/generate/images` (server/app/api/routes/generation.py) |
| GET `/api/generate/{}/status` | client/services/apiService.ts:77 | `/api/generate/{job_id}/status` (server/app/api/routes/generation.py) |
| GET `/api/generate/{}/result` | client/services/apiService.ts:122 | `/api/generate/{job_id}/result` (server/app/api/routes/generation.py) |
| POST `/api/generate/full-bank` | client/services/apiService.ts:130 | `/api/generate/full-bank` (server/app/api/routes/generation.py) |
| POST `/api/generate/divide-unit` | client/services/apiService.ts:169 | `/api/generate/divide-unit` (server/app/api/routes/generation.py) |
| POST `/api/generate/refine` | client/services/apiService.ts:181 | `/api/generate/refine` (server/app/api/routes/generation.py) |
| POST `/api/feedback/submit` | client/services/apiService.ts:205 | `/api/feedback/submit` (server/app/api/routes/feedback.py) |
| POST `/api/generate/clear` | client/services/apiService.ts:242 | `/api/generate/clear` (server/app/api/routes/generation.py) |

### Database objects found in files
