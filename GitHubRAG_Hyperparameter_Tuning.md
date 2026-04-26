# GitHub Repos RAG — Hyperparameter Tuning

This document focuses only on tunable parameters in the current implementation.

---

## 2.1 Chunking Parameters

| Parameter         | Current Value | Rationale                                                            | Tuning Experiment                                                                          |
| ----------------- | ------------: | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Code chunk size   |          3000 | Preserve whole function/class regions and reduce over-fragmentation. | Sweep 1800, 2400, 3000, 3600; evaluate Recall@10 and MRR on function-level queries.        |
| Code overlap      |           500 | Maintains continuity across function boundaries and partial splits.  | Sweep 200, 350, 500, 700 while fixing chunk size; measure duplicate-hit rate vs Recall@10. |
| Docs chunk size   |          2000 | Keeps coherent paragraphs/sections without excessive chunk count.    | Sweep 1200, 1600, 2000, 2400 on architecture/documentation queries.                        |
| Docs overlap      |           400 | Prevents losing section transitions across splits.                   | Sweep 150, 250, 400, 600; track NDCG@10 for architecture-level questions.                  |
| Config chunk size |          1500 | Config files are compact, high-density, and less narrative.          | Sweep 700, 1000, 1500, 2000 and compare relevance on build/dependency queries.             |
| Config overlap    |           200 | Enough for boundary continuity with low redundancy.                  | Sweep 50, 100, 200, 300 and monitor retrieval precision for config-targeted prompts.       |

---

## 2.2 Search Parameters

| Parameter        |                               Current Value | Rationale                                                               | Tuning Experiment                                                                      |
| ---------------- | ------------------------------------------: | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Score threshold  |                                        0.25 | Filters weak matches while keeping enough candidates for broad queries. | Sweep 0.20, 0.25, 0.30, 0.35; report precision/recall trade-off and groundedness rate. |
| topK (returned)  |                                          10 | Balances context coverage and prompt budget.                            | Sweep 5, 8, 10, 15; evaluate answer quality vs token overhead.                         |
| Fetch multiplier | 2x target (20 fetch) / currently 1x in code | Candidate expansion before threshold can improve quality robustness.    | Implement rawK = topK \* fetchMultiplier; compare 1x, 2x, 3x under same threshold.     |
| Search timeout   |                                      8000ms | Protects chat latency budget with room for Pinecone + formatting.       | Test 5000, 8000, 12000; track timeout rate and p95 end-to-end latency.                 |

---

## 2.3 Ingestion Parameters

| Parameter      | Current Value | Rationale                                                            | Tuning Experiment                                                                  |
| -------------- | ------------: | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Batch size     |            96 | Stable upsert payload size with predictable memory/network behavior. | Test 64, 96, 128; compare indexing throughput, failures, and retry rate.           |
| Max files/repo |           500 | Prevents huge repos from dominating indexing time/cost.              | Test 300, 500, 800 with priority sorting; measure Recall@10 and ingestion latency. |
| Max file size  |         100KB | Excludes minified/generated blobs and oversized noise.               | Test 64KB, 100KB, 160KB; inspect quality gain vs index pollution.                  |
| Clone timeout  |          120s | Avoids hung ingestion workers on network/repo issues.                | Test adaptive timeout by repo size percentiles from GitHub API metadata.           |
| Max repos/user |            20 | Tenant quota control and capacity protection.                        | Test 20 vs 30 for power users; monitor index growth and cross-user latency impact. |

---

## 2.4 Recommended Tuning Priority (Quality-First)

1. Score threshold

- أكبر مؤثر مباشر على جودة السياق الذي يصل إلى LLM.

2. Code chunk size and code overlap

- أهم عامل في أسئلة الكود الفعلية (function/method behavior).

3. Fetch multiplier (تطبيق 2x)

- يرفع جودة المرشحين قبل الفلترة النهائية.

4. topK returned

- يوازن بين التغطية والضجيج/ميزانية التوكن.

5. Max files/repo + priority strategy

- يحدد ما إذا كانت الملفات المهمة تدخل الفهرسة أصلاً.

6. Docs/config chunk params

- مؤثرة خصوصاً لأسئلة المعمارية والإعدادات.

7. Batch size, clone timeout, max repos/user

- تأثيرها الأكبر تشغيلي/تكلفة أكثر من جودة الاسترجاع.

---

## Suggested Immediate Changes

```js
// config.js
export const SEARCH_FETCH_MULTIPLIER = 2;
export const SEARCH_TIMEOUT_MS = 8000;

// search.js
const rawK = Math.max(topK, topK * SEARCH_FETCH_MULTIPLIER);
const rawResults = await store.similaritySearchWithScore(query, rawK, filter);
const scored = rawResults
  .map(([doc, score]) => ({ doc, score }))
  .filter((r) => r.score >= SEARCH_SCORE_THRESHOLD)
  .slice(0, topK);
```
