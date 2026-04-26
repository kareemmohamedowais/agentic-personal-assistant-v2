# GitHub Repos RAG — Regularization Analysis

In this RAG context, regularization means constraining retrieval so it does not overfit superficial signals and remains semantically grounded.

---

## 3.1 Existing Regularization Mechanisms

### Score threshold (0.25)

- Mechanism: remove low-score matches before prompt construction.
- Effect: suppress accidental semantic neighbors.

### Fetch-then-filter (20 -> 10)

- Intended mechanism in system design: widen candidate pool then prune.
- Effect: avoids over-committing to a narrow first ranking.
- Current status: not fully implemented in current search.js (currently fetches topK directly).

### Language-aware splitting

- Mechanism: split on semantic boundaries (def, class, func, etc.).
- Effect: reduces broken-context embeddings that attract false positives.

### Chunk header prepending

- Mechanism: prepend repo/file/language/chunk ordinal in each embedded chunk.
- Effect: anchors vector space to source context and reduces ambiguity.

### File-type segregation (code/docs/config)

- Mechanism: different chunking profiles by file type.
- Effect: prevents config/doc noise from polluting code retrieval.

### Binary detection

- Mechanism: null-byte scan before indexing.
- Effect: blocks non-semantic binary payloads from entering vector store.

### Ignored directories list

- Mechanism: skip dependency/build/cache/editor artifacts.
- Effect: keeps index focused on high-signal source files.

---

## 3.2 Proposed Additional Regularization

## 1) Near-duplicate chunk suppression

Description:

- remove highly similar chunks within same repo before upsert.

How it reduces noise:

- stops repetitive templates/generated blocks from dominating neighbors.

Implementation sketch:

```js
import crypto from "node:crypto";

function normalizeForDedup(text) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function hashChunk(text) {
  return crypto
    .createHash("sha1")
    .update(normalizeForDedup(text))
    .digest("hex");
}

function dedupDocuments(docs) {
  const seen = new Set();
  return docs.filter((d) => {
    const h = hashChunk(d.pageContent.slice(0, 5000));
    if (seen.has(h)) return false;
    seen.add(h);
    return true;
  });
}
```

Trade-off:

- may remove intentionally repeated boilerplate used for debugging/comparison.

## 2) Minimum semantic chunk length gate

Description:

- discard tiny chunks unless they contain strong semantic tokens.

How it reduces noise:

- tiny fragments often overfit lexical coincidence.

Implementation sketch:

```js
function keepChunk(chunk, fileType) {
  const minLen = fileType === "code" ? 120 : 80;
  if (chunk.length >= minLen) return true;
  return /(class|function|def|interface|SELECT|CREATE|import)/i.test(chunk);
}
```

Trade-off:

- may drop concise but useful constant/config snippets.

## 3) Lightweight reranking layer

Description:

- rerank top Pinecone candidates with a second-stage signal.

How it reduces noise:

- corrects cosine-only ranking errors.

Implementation sketch:

```js
function rerank(query, items) {
  const q = query.toLowerCase();
  return items
    .map((it) => {
      const txt = it.doc.pageContent.toLowerCase();
      const lexicalBoost = ["function", "class", "def", "import"].some(
        (k) => q.includes(k) && txt.includes(k),
      )
        ? 0.05
        : 0;
      return { ...it, finalScore: it.score + lexicalBoost };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
```

Trade-off:

- extra latency and tuning complexity.

## 4) Query-intent adaptive threshold

Description:

- dynamic threshold by query intent (function-level vs architecture-level).

How it reduces noise:

- strict filtering for precise code lookup, looser filtering for broad architectural retrieval.

Implementation sketch:

```js
function inferQueryType(query) {
  const q = query.toLowerCase();
  if (
    /(how does .* work|where is .* implemented|function|method|class)/.test(q)
  )
    return "function";
  if (/(architecture|structure|flow|module|dependency)/.test(q))
    return "architecture";
  return "general";
}

function thresholdFor(type) {
  if (type === "function") return 0.3;
  if (type === "architecture") return 0.22;
  return 0.25;
}
```

Trade-off:

- misclassified intents can over-prune or under-prune.

## 5) Path-aware negative filters

Description:

- suppress known low-value path patterns at retrieval-time.

How it reduces noise:

- prevents lock/minified/snapshot artifacts from resurfacing.

Implementation sketch:

```js
function isLowValuePath(filePath = "") {
  return /\.min\.js$|package-lock\.json$|yarn\.lock$|\.snap$/.test(filePath);
}

const filtered = scored.filter((r) => !isLowValuePath(r.doc.metadata.filePath));
```

Trade-off:

- a filtered file can occasionally be useful in edge debugging cases.

---

## Recommendation Order

1. Implement fetch multiplier and threshold pipeline.
2. Add near-duplicate suppression in indexing.
3. Add min chunk-length gate.
4. Add intent-adaptive threshold.
5. Add reranking as phase-2 enhancement.
