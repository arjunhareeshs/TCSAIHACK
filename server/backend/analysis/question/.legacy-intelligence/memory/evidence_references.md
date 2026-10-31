# Evidence References

## Evidence index

| ID | Location | Agent | Note |
|---|---|---|---|
| E1 | client/.env.local:1-1 | static-analyzer | env file present in project tree |
| E2 | server/requirements.txt:5-5 | static-analyzer | unpinned requirement |
| E3 | client/App.tsx:33-232 | static-analyzer | very large function |
| E4 | client/components/AnimatedBackground.tsx:72-271 | static-analyzer | very large function |
| E5 | client/components/QuestionBankView.tsx:25-224 | static-analyzer | very large function |
| E6 | client/components/QuestionCard.tsx:27-226 | static-analyzer | very large function |
| E7 | client/components/ActivityLog.tsx:60-259 | static-analyzer | very large function |
| E8 | client/App.tsx:306-310 | A7:1#1 | total marks fallback calculation |
| E9 | client/App.tsx:260-263 | A7:1#1 | default mark distribution |
| E10 | client/services/geminiService.ts:68-70 | A7:2#2 | PDF validation call |
