# Human Review Queue

Nothing here is a deletion order. Each item needs a named person to decide. Items marked 'deterministic' have not yet been challenged by the Obsolescence Adjudicator.

## HIDDEN_CRITICAL (0)

Hidden critical code: looks unused but evidence says it matters. Protect, confirm the rule.


## LIVE_UNDOCUMENTED_RULE (15)

Live code with an undocumented business rule. Protect, document, add characterization tests.

| Symbol | Location | Decided by | Rationale |
|---|---|---|---|
| `exportAsPDF` | client/App.tsx:297-456 | deterministic |  |
| `animate` | client/components/AnimatedBackground.tsx:297-384 | deterministic |  |
| `validatePDF` | client/services/geminiService.ts:30-45 | deterministic |  |
| `RateLimitMiddleware.dispatch` | server/app/api/middleware/rate_limit.py:29-62 | deterministic |  |
| `submit_feedback` | server/app/api/routes/feedback.py:14-50 | deterministic |  |
| `generate_full_question_bank` | server/app/api/routes/generation.py:127-297 | deterministic |  |
| `generate_questions_from_images` | server/app/api/routes/images.py:138-212 | deterministic |  |
| `Evaluator.evaluate` | server/app/engine/agents/evaluator.py:22-109 | deterministic |  |
| `SwarmOrchestrator._run_legacy` | server/app/engine/agents/orchestrator.py:198-273 | deterministic |  |
| `EvaluatorChain._validate_rules` | server/app/engine/langchain/chains.py:536-561 | deterministic |  |
| `EliteQualityPipeline.validate_question_bank` | server/app/engine/langchain/self_correction.py:374-409 | deterministic |  |
| `GenerationService._check_completion` | server/app/services/generation.py:433-497 | deterministic |  |
| `QuestionBankGenerator.generate_full_bank` | server/app/services/question_bank_generator.py:113-201 | deterministic |  |
| `QuestionBankGenerator._extract_json` | server/app/services/question_bank_generator.py:280-315 | deterministic |  |
| `QuestionBankGenerator._validate_bank` | server/app/services/question_bank_generator.py:394-447 | deterministic |  |

## NEEDS_HUMAN (3)

Mixed evidence. A person must decide.

| Symbol | Location | Decided by | Rationale |
|---|---|---|---|
| `generateQuestionBank` | client/services/geminiService.ts:55-223 | deterministic |  |
| `DiskPersistentCache.cleanup_expired` | server/app/engine/langchain/caching.py:247-261 | deterministic |  |
| `PedagogyValidator.validate_bank` | server/app/engine/pedagogy/validator.py:27-51 | deterministic |  |

## OBSOLETE_CANDIDATE (48)

Obsolete candidates: no usage and no criticality signal found. Recommended action: add usage logging for an agreed period, then human sign-off. Never delete directly.

| Symbol | Location | Decided by | Rationale |
|---|---|---|---|
| `divideUnitSyllabus` | client/services/apiService.ts:163-176 | deterministic |  |
| `submitFeedback` | client/services/apiService.ts:199-204 | deterministic |  |
| `testAPIKey` | client/services/geminiService.ts:228-240 | deterministic |  |
| `NotFoundError` | server/app/api/middleware/errors.py:50-52 | deterministic |  |
| `ValidationError` | server/app/api/middleware/errors.py:55-57 | deterministic |  |
| `MermaidGenerator.generate_for_question` | server/app/engine/mermaid.py:106-125 | deterministic |  |
| `get_question_type_for_marks` | server/app/engine/question_bank_prompts.py:563-600 | deterministic |  |
| `IngestionPipeline.ingest_text` | server/app/engine/ingestion/pipeline.py:167-189 | deterministic |  |
| `InMemorySemanticCache.get_stats` | server/app/engine/langchain/caching.py:108-114 | deterministic |  |
| `get_default_cache` | server/app/engine/langchain/caching.py:385-390 | deterministic |  |
| `DynamicExampleSelector.select_by_type` | server/app/engine/langchain/few_shot.py:259-262 | deterministic |  |
| `DynamicExampleSelector.select_semantic` | server/app/engine/langchain/few_shot.py:264-284 | deterministic |  |
| `ExampleEnhancedChain.generate_question_bank` | server/app/engine/langchain/few_shot.py:334-366 | deterministic |  |
| `get_question_examples` | server/app/engine/langchain/few_shot.py:378-380 | deterministic |  |
| `get_aku_examples` | server/app/engine/langchain/few_shot.py:383-385 | deterministic |  |
| `check_stage_success` | server/app/engine/langchain/graph.py:309-313 | deterministic |  |
| `LLMProvider._create_openai_compatible_llm` | server/app/engine/langchain/llm_provider.py:78-94 | deterministic |  |
| `RAGChainBuilder.build_basic_rag` | server/app/engine/langchain/rag_chains.py:81-100 | deterministic |  |
| `RAGChainBuilder.build_hybrid_rag` | server/app/engine/langchain/rag_chains.py:168-218 | deterministic |  |
| `QuestionGenerationRAG.get_context_for_aku` | server/app/engine/langchain/rag_chains.py:235-245 | deterministic |  |
| `QuestionGenerationRAG.get_similar_questions` | server/app/engine/langchain/rag_chains.py:258-268 | deterministic |  |
| `QuestionGenerationRAG.enrich_question_with_context` | server/app/engine/langchain/rag_chains.py:270-303 | deterministic |  |
| `RegenerationRAG.regenerate_with_new_context` | server/app/engine/langchain/rag_chains.py:320-388 | deterministic |  |
| `RefinedOutput` | server/app/engine/langchain/self_correction.py:35-40 | deterministic |  |
| `SelfCorrectingChain.batch_critique_and_refine` | server/app/engine/langchain/self_correction.py:234-247 | deterministic |  |
| `SelfConsistencyChecker.check_consistency` | server/app/engine/langchain/self_correction.py:259-289 | deterministic |  |
| `ReflectionChain.reflect_and_improve` | server/app/engine/langchain/self_correction.py:323-356 | deterministic |  |
| `StreamingCallbackHandler.get_tokens` | server/app/engine/langchain/streaming.py:99-101 | deterministic |  |
| `ProgressTracker.get_progress` | server/app/engine/langchain/streaming.py:235-237 | deterministic |  |
| `create_pipeline_sse` | server/app/engine/langchain/streaming.py:329-374 | deterministic |  |
| `WebSocketStreamer.stream_chain` | server/app/engine/langchain/streaming.py:389-397 | deterministic |  |
| `WebSocketStreamer.stream_pipeline` | server/app/engine/langchain/streaming.py:399-422 | deterministic |  |
| `create_streaming_callback` | server/app/engine/langchain/streaming.py:439-444 | deterministic |  |
| `get_structured_regeneration_chain` | server/app/engine/langchain/structured_output.py:189-192 | deterministic |  |
| `get_structured_vision_chain` | server/app/engine/langchain/structured_output.py:195-198 | deterministic |  |
| `ElitePipelineCallback.on_llm_start` | server/app/engine/langchain/tracing.py:97-100 | deterministic |  |
| `ElitePipelineCallback.on_retry` | server/app/engine/langchain/tracing.py:115-118 | deterministic |  |
| `CostTrackingCallback.get_total_cost` | server/app/engine/langchain/tracing.py:204-206 | deterministic |  |
| `MetricsCollector.record_run` | server/app/engine/langchain/tracing.py:278-283 | deterministic |  |
| `MetricsCollector.get_average_time` | server/app/engine/langchain/tracing.py:285-289 | deterministic |  |
| `MetricsCollector.get_success_rate` | server/app/engine/langchain/tracing.py:291-296 | deterministic |  |
| `MetricsCollector.get_agent_performance` | server/app/engine/langchain/tracing.py:298-310 | deterministic |  |
| `JobStore.update_job` | server/app/models/database.py:98-104 | deterministic |  |
| `ActivityLogger.clear_job` | server/app/services/activity_logger.py:138-143 | deterministic |  |
| `GenerationService._resume_job` | server/app/services/generation.py:500-553 | deterministic |  |
| `ImageExtractor.get_image_path` | server/app/services/image_extraction.py:124-131 | deterministic |  |
| `IngestionAssistant.ingest_batch` | server/app/services/ingestion_assistant.py:31-186 | deterministic |  |
| `MermaidCLI.render` | server/app/utils/mermaid_cli.py:22-85 | deterministic |  |

## Open questions from findings (1)

- F-1 [Potential] Environment file present in the project tree: client/.env.local: Is this file tracked by the project's Git repository?

## Reopened because evidence changed (0)
