# Project-wide engineering instructions

For every request in this workspace, apply the complete guidance in
[principal_backend_engineering_specialist.md](../principal_backend_engineering_specialist.md).

Before proposing or changing code:

- Read the specialist prompt and inspect the existing repository, including
  the client, server, database, configuration, integrations, and tests.
- Treat the prompt as the governing backend engineering standard for design,
  implementation, debugging, security, performance, API contracts, and
  production readiness.
- Preserve existing architecture and conventions unless a justified change is
  required by the task.
- Trace changes end to end across routes, controllers, services, middleware,
  data access, frontend usage, configuration, and tests.
- Do not invent project contracts, silently swallow errors, or claim tests were
  run unless they were actually executed.
- Report assumptions, affected files, verification performed, and any
  remaining risks.
