# Problem Catalogue

Every problem cites evidence. Technical problems and business risks are kept as separate categories; modernization opportunities are not mandatory changes.

| ID | Problem | Category | Severity | Confidence | Evidence | Found by | Validation needed |
|---|---|---|---|---|---|---|---|
| P-1 | Environment file present in the project tree: client/.env.local: A real .env-style file exists in the source tree. Variable names only are shown to agents. Confirm it is not committed to version control. | security | medium | Potential | [E1] client/.env.local:1-1 | static-analyzer | Is this file tracked by the project's Git repository? |
| P-2 | 29 unpinned dependencies in server/requirements.txt: Requirements without an exact version (first at line 5) make builds non-reproducible and block vulnerability matching. | dependency | medium | Verified | [E2] server/requirements.txt:5-5 | static-analyzer | confirm in review |
| P-3 | 5 very large function(s) (120+ lines): client/App.tsx::App (730 lines); client/components/AnimatedBackground.tsx::AnimatedBackground (330 lines); client/components/QuestionBankView.tsx::Que | technical_debt | low | Verified | [E3] client/App.tsx:33-232, [E4] client/components/AnimatedBackground.tsx:72-271, [E5] client/components/QuestionBankView.tsx:25-224, [E6] client/components/QuestionCard.tsx:27-226 | static-analyzer | confirm in review |
