# GitHub Repos RAG — Overfitting Analysis

In this system, overfitting means retrieval repeatedly matching surface patterns instead of true semantic intent.

---

## 4.1 Overfitting Risk Factors

### Shared embedding model (not code-specific)

Risk:

- semantic space may favor natural-language similarity over code-specific semantics.

Current mitigation:

- language-aware splitting + contextual header + file grouping.

Residual risk: Medium.

### Large code chunks (3000)

Risk:

- embeddings can average multiple concerns and dilute intent signal.

Current mitigation:

- semantic separators and overlap.

Residual risk: Medium.

### Low score threshold (0.25)

Risk:

- permissive floor can allow accidental neighbors.

Current mitigation:

- threshold still removes very weak results.

Residual risk: Medium-High on broad queries.

### No dedicated reranker

Risk:

- cosine-only ranking can overvalue lexical coincidence.

Current mitigation:

- group-by-file improves coherence but not relevance ranking.

Residual risk: High.

### Header repetition in each chunk

Risk:

- repeated source tokens could bias similarity toward file/path signals.

Current mitigation:

- header is still semantically useful for disambiguation.

Residual risk: Low-Medium.

---

## 4.2 Evaluation Protocol

### Definition of good retrieval

A good retrieval should:

- place at least one directly relevant chunk near top ranks,
- include adjacent supporting chunks when needed,
- enable grounded, file-cited answers.

### Query set (3 categories)

1. Function-level

- Where is token verification implemented?
- How does retry logic in API client work?
- Where is cloning timeout configured?

2. Architecture-level

- How does ingestion flow from add endpoint to Pinecone?
- What are indexing status transitions?
- How are user preferences applied in retrieval?

3. Cross-file dependency

- How does search output move into agent prompt?
- Where are repo limits defined and enforced?
- How does parser output shape indexer metadata?

### Metrics

- MRR@10: primary metric (top-hit quality for chat responses)
- Recall@10: secondary metric (coverage for multi-file questions)
- NDCG@10: graded relevance ordering quality

Most appropriate primary metric for this system:

- MRR@10 (because first few retrieved chunks dominate final answer quality)

### Ground-truth labeling strategy

1. Build 50-100 real product queries.
2. Label chunk relevance with grades:

- 2 = directly answers
- 1 = supporting context
- 0 = irrelevant

3. Use two annotators, reconcile disagreements.
4. Store labels in JSON and run offline benchmark per experiment.

Example schema:

```js
{
  queryId: "Q12",
  query: "How is clone timeout configured?",
  relevant: [
    { repo: "owner/repo", filePath: "server/githubRepos/fetcher.js", chunkIndex: 0, grade: 2 },
    { repo: "owner/repo", filePath: "server/githubRepos/config.js", chunkIndex: 0, grade: 1 }
  ]
}
```

---

## 4.3 Mitigations Already in Place

- Score threshold -> suppresses accidental low-signal matches.
- Group-by-file + chunk order -> reduces chunk-level overfitting and improves local coherence.
- Language-aware splitting -> prevents semantic boundary violations.
- Project tree context -> anchors responses in structural repo context.
- Dual filter (repo + userId) -> prevents tenant/corpus contamination.

---

## 4.4 Proposed Mitigations

| Mitigation                          | Expected Improvement | Cost   | Recommendation                                     |
| ----------------------------------- | -------------------- | ------ | -------------------------------------------------- |
| Fetch multiplier + threshold + trim | Medium-High          | Low    | Implement first in search path.                    |
| Near-duplicate suppression          | Medium               | Medium | Implement in index pipeline for large repos.       |
| Intent-adaptive threshold           | Medium               | Medium | Pilot with fallback to static 0.25.                |
| Top-candidate reranking             | High                 | High   | Add after benchmark harness is in place.           |
| Minimum chunk-length gate           | Low-Medium           | Low    | Enable conservatively and monitor false negatives. |
| Header ablation test                | Medium               | Medium | Validate header benefit vs source-token bias.      |

---

## Practical Rollout Plan

1. Align implementation with documented retrieval pipeline (2x fetch).
2. Add benchmark harness (MRR, Recall, NDCG) with labeled set.
3. Tune threshold + chunk geometry first.
4. Introduce dedup and chunk-length gate.
5. Add reranker only after baseline metrics stabilize.
