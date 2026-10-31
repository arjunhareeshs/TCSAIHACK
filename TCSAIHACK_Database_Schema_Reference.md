# TCSAIHACK / LegacyX — Database Schema Reference

**Source:** Supabase SQL Editor screenshots supplied on 2026-10-31.  
**Scope:** `public` schema, plus the two observed private Storage buckets.  
**Important limitation:** The columns screenshot reports 100 rows and is visibly truncated. This document records all 17 public table names and the foreign-key links visible in the supplied screenshots; it does not invent unseen columns or claim to be a full executable migration. Use `TCSAIHACK_Database_Schema_Inspection.sql` to export the complete live schema.

## Public tables observed

1. `users`
2. `organizations`
3. `organization_members`
4. `teams`
5. `team_members`
6. `projects`
7. `project_files`
8. `project_evidence`
9. `project_change_tickets`
10. `project_incidents`
11. `project_logs`
12. `analysis_settings`
13. `ai_analysis`
14. `business_rules`
15. `dependencies`
16. `risk_analysis`
17. `modernization_recommendations`

## Foreign-key relationships observed

| Child table | FK column | References |
|---|---|---|
| organizations | owner_id | users.id |
| organization_members | organization_id | organizations.id |
| organization_members | user_id | users.id |
| teams | organization_id | organizations.id |
| teams | created_by | users.id |
| team_members | team_id | teams.id |
| team_members | user_id | users.id |
| projects | owner_id | users.id |
| projects | organization_id | organizations.id |
| projects | team_id | teams.id |
| project_files | project_id | projects.id |
| project_files | uploaded_by | users.id |
| project_evidence | project_id | projects.id |
| project_evidence | uploaded_by | users.id |
| project_evidence | file_id | project_files.id |
| project_change_tickets | project_id | projects.id |
| project_change_tickets | created_by | users.id |
| project_incidents | project_id | projects.id |
| project_incidents | reported_by | users.id |
| project_logs | project_id | projects.id |
| project_logs | user_id | users.id |
| analysis_settings | project_id | projects.id |
| ai_analysis | project_id | projects.id |
| ai_analysis | initiated_by | users.id |
| business_rules | analysis_id | ai_analysis.id |
| business_rules | project_id | projects.id |
| dependencies | analysis_id | ai_analysis.id |
| dependencies | project_id | projects.id |
| risk_analysis | analysis_id | ai_analysis.id |
| risk_analysis | project_id | projects.id |
| modernization_recommendations | analysis_id | ai_analysis.id |
| modernization_recommendations | project_id | projects.id |

The screenshots show 32 foreign-key rows in total. The list above reconstructs those visible links.

## Columns confirmed from the screenshots

### `users`
- `id` — integer, primary key, sequence default
- `auth_user_id` — character varying, NOT NULL, unique, references `auth.users(id)` with `ON DELETE CASCADE`
- `email` — character varying, NOT NULL, unique
- `role` — character varying, NOT NULL, default `'user'`
- `is_active` — boolean, NOT NULL, default `true`
- `created_at` — timestamp with time zone, NOT NULL, default `CURRENT_TIMESTAMP`
- `updated_at` — timestamp with time zone, NOT NULL, default `CURRENT_TIMESTAMP`

### `ai_analysis` (visible portion)
- `id` — uuid, NOT NULL, default `gen_random_uuid()`
- `project_id` — uuid, NOT NULL, FK to `projects.id`
- `initiated_by` — integer, nullable, FK to `users.id`
- `analysis_type` — character varying, NOT NULL
- `status` — character varying, nullable, default `'PENDING'`
- `result_summary` — text, nullable
- `result_path` — text, nullable
- `error_message` — text, nullable
- `started_at` — timestamp with time zone, nullable
- `completed_at` — timestamp with time zone, nullable (visible in screenshot)

## Storage

Two private buckets were created and verified:

| Bucket ID | Public |
|---|---:|
| `legacy-source-code` | false |
| `legacy-evidence` | false |

Suggested usage:
- `legacy-source-code`: uploaded legacy application archives/source artifacts.
- `legacy-evidence`: supporting evidence such as schemas, API definitions, incidents and change tickets.

## Security / database behaviour observed

- Row Level Security was enabled on the listed public tables in the supplied RLS status query.
- The policy query returned 43 policies across `public` and `storage`.
- Auth trigger `on_auth_user_created` was verified on `auth.users` for INSERT and executes `handle_new_user()`.
- Do not treat RLS being enabled as proof that access is correct; validate each policy with authenticated users from different organizations/teams.

## ER diagram

Open `TCSAIHACK_ER_Diagram.drawio` with diagrams.net (draw.io). The diagram is editable. Relationship lines represent the foreign keys visible in the screenshots.

## Get the complete, exact schema

Run the queries in `TCSAIHACK_Database_Schema_Inspection.sql` in Supabase SQL Editor. Export the results, especially query 1 (columns), query 2 (foreign keys), and query 3 (PK/unique constraints). Those exports are needed to produce a complete, executable DDL snapshot with every column, type, default, constraint, and delete/update rule.
