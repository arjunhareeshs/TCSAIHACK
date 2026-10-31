# Testing and Regression Strategy

## Principle

Characterization tests are written and passing BEFORE any migration step touches protected behaviour. A change that alters a protected result is a defect unless a person has approved the new rule.

## Protected behaviour needing characterization tests (15)

| Item | Location | Why protected | Required test |
|---|---|---|---|
| `exportAsPDF` | client/App.tsx:297 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `animate` | client/components/AnimatedBackground.tsx:297 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `validatePDF` | client/services/geminiService.ts:30 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `RateLimitMiddleware.dispatch` | server/app/api/middleware/rate_limit.py:29 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `submit_feedback` | server/app/api/routes/feedback.py:14 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `generate_full_question_bank` | server/app/api/routes/generation.py:127 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `generate_questions_from_images` | server/app/api/routes/images.py:138 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `Evaluator.evaluate` | server/app/engine/agents/evaluator.py:22 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `SwarmOrchestrator._run_legacy` | server/app/engine/agents/orchestrator.py:198 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `EvaluatorChain._validate_rules` | server/app/engine/langchain/chains.py:536 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `EliteQualityPipeline.validate_question_bank` | server/app/engine/langchain/self_correction.py:374 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `GenerationService._check_completion` | server/app/services/generation.py:433 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `QuestionBankGenerator.generate_full_bank` | server/app/services/question_bank_generator.py:113 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `QuestionBankGenerator._extract_json` | server/app/services/question_bank_generator.py:280 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |
| `QuestionBankGenerator._validate_bank` | server/app/services/question_bank_generator.py:394 | LIVE_UNDOCUMENTED_RULE | golden-master test on current outputs |

## Layers

1. Characterization (golden master) tests for protected items above.
2. Contract tests for every frontend-to-backend call listed in dependency_map.md.
3. Data-migration reconciliation checks (row counts, checksums) for any store change.
4. Usage logging for obsolete candidates for an agreed period before retirement.
5. Smoke and end-to-end tests of the critical workflows before each phase gate.
