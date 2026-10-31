# Security Assessment

Credential values are never shown. 'Potential' items need confirmation.

| ID | Problem | Category | Severity | Confidence | Evidence | Found by | Validation needed |
|---|---|---|---|---|---|---|---|
| P-1 | Environment file present in the project tree: client/.env.local: A real .env-style file exists in the source tree. Variable names only are shown to agents. Confirm it is not committed to version control. | security | medium | Potential | [E1] client/.env.local:1-1 | static-analyzer | Is this file tracked by the project's Git repository? |
