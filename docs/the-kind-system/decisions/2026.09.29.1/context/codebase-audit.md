# Codebase audit: release 2026.09.29.1

**Taken at:** branch `staging`, commit `15a1016` (releases 2026.09.29 and 2026.09.29.1 uncommitted), 2026-09-29. Website line numbers re-checked after rebasing onto `e421f5e`
**By:** Claude Opus 5.5, using read-only inspection
**Purpose:** check each point in `analysis.md` against what the codebase actually does

| Topic | Found |
|---|---|
| AI companion | **Not in the repository.** No conversational companion code exists. |
| Live AI output | **Yes.** `apps/api/src/feedContent.js` rewrites participant-facing feed copy with the OpenAI API (default model `gpt-4o-mini`) when `OPENAI_API_KEY` is available, and falls back to deterministic token-filled templates when it isn't or when the call fails. The system prompt carries `TONE` from `apps/api/src/data/morningRulesFeedLibrary.js` (association-not-causation, hedge by evidence strength, no shame, privacy in comparisons, preserve numbers). Safety copy (`SAFETY.severeCrash`) is appended verbatim and never LLM-rewritten. Outputs are not validated against the "preserve numbers" rule, and prompts and outputs are not logged. It is exposed as `POST /feed/generate` (auth required) in `apps/api/src/worker.js`. The scheduled path in `apps/api/src/lib/userExplorationUpdates.js` passes `openaiApiKey: null`, so it is template-only. Whether the production Worker has `OPENAI_API_KEY` set can't be seen from source. |
| Crisis redirect (911/988) | **Not found** anywhere under `apps/mobile/src` or `apps/api/src`. |
| Cohort minimum | `COHORT_MIN = 50` in `apps/api/src/data/morningRulesFeedLibrary.js`. It gates community comparison items in the feed. No Kind-wide minimum was found. |
| Matching engine | `apps/api/src/lib/onboardingRecommendations.js`: `scoreExploration` adds fixed `HEALTH_GOAL_BOOSTS` per onboarding goal. It is deterministic, uses no model, and doesn't use other individuals' outcomes. |
| CENT | `apps/api/src/lib/cent/` and `centShort/` analyse logged data and produce results reports. That is *reporting*, consistent with CENT's role (Q1 in `clarifications.md`). |
| Researcher data access | There is no Researcher Dashboard, export, or DUA flow. The website says researcher data is "always anonymised and aggregated": `apps/kind-website/faq.html:134`, `individuals.html:284`, `researchers.html:164`, and `privacy-policy.html:102` ("only anonymised, aggregated data"). `researchers.html:313` also mentions tools to "query, visualise, and export data". The website also says "Kind is built to HIPAA-compliant standards" (`faq.html:134`), while the deck (s11) says Kind is not a HIPAA covered entity and makes no HIPAA claims. |
| Protocol generation / DSPy / GROBID | Still absent (as in `2026.09.29/context/codebase-audit.md`). |
