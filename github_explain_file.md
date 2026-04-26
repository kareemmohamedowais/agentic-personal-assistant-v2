# GitHub Repos RAG System — Deep Technical Explanation (Code-Grounded)

This document explains the GitHub Repos RAG feature implemented in `server/githubRepos/` using:

- Documentation map:
  - `GitHubRAG_ProposalSubmission.md`
  - `GitHubRAG_BaselineModel.md`
  - `GitHubRAG_DataPreprocessing.md`
- Ground truth implementation:
  - `server/githubRepos/config.js`
  - `server/githubRepos/fetcher.js`
  - `server/githubRepos/parser.js`
  - `server/githubRepos/indexer.js`
  - `server/githubRepos/search.js`
  - `server/githubRepos/routes.js`
  - Integration points in `server/agent.js`, `server/index.js`, `server/db.js`

Code is treated as source of truth wherever docs differ.

---

## 1. WHY This Feature Exists

### Problem it solves

Developers need answers about large repositories fast: where logic lives, how modules interact, and what implementation actually does. Manual navigation in unfamiliar repos is slow and error-prone, especially when repos are big, polyglot, and include noisy generated/build assets.

### Why manual search is insufficient

Manual methods (`grep`, GitHub UI search, opening files one by one) fail in common cases:

- Query intent is conceptual ("how auth works") rather than exact token search.
- Relevant behavior spans multiple files and directories.
- Top search hits may be low-value chunks (tests, stale docs, minified files).
- Users need synthesized explanation, not just matching lines.

### Why RAG was chosen

RAG adds semantic retrieval over indexed repository chunks, then injects retrieved code context into the model prompt. That gives:

- semantic matching over code + docs + config,
- scoped retrieval by user and selected repositories,
- controlled context formatting before generation.

### How it fits the larger assistant

This system is one of three knowledge modes (documents, dev docs, GitHub repos). In chat flow, GitHub mode can be enabled and repository context is fetched and appended into the system prompt in `server/agent.js`.

Actual integration call:

```js
githubReposMode && githubRepos.length > 0
  ? searchGithubRepos(finalMessage, githubRepos, userId).catch((e) => {
      console.warn("GitHub repos search failed:", e.message);
      return null;
    })
  : Promise.resolve(null);
```

And prompt injection block:

```js
if (githubReposContext) {
  full += `\n\n## GitHub Repository Code Context\nBelow are code excerpts retrieved from the user's indexed GitHub repositories...\n\n${githubReposContext}`;
}
```

---

## 2. Architecture Overview

End-to-end flow:

User adds repository URL
-> Cloning (`fetcher.js`)
-> Parsing (`parser.js`)
-> Indexing (`indexer.js`)
-> Pinecone namespace `github_repos`
-> Semantic search (`search.js`)
-> Agent prompt augmentation (`agent.js`)
-> Final answer

### Step A: Add repository (API)

Handled by `POST /api/github-repos/add` in `server/githubRepos/routes.js`.

What happens:

1. Validate URL input.
2. Parse owner/name via `parseGitHubUrl`.
3. Enforce user repo quota (`MAX_REPOS_PER_USER`).
4. Prevent duplicate active ingest for same user/repo.
5. Fetch GitHub metadata via API.
6. Insert DB row with `pending` status.
7. Respond immediately.
8. Start background ingestion (`runRepoIngestion`).

Why this design:

- non-blocking UX,
- robust status tracking,
- safe retries and error states.

### Step B: Clone repository

Handled by `cloneRepo` in `fetcher.js`.

What happens:

- shallow clone (`--depth 1 --single-branch`) into OS temp folder,
- timeout guard at 120s,
- cleanup on clone failure.

Why:

- faster clone,
- lower disk/network cost,
- avoids persistent clone storage.

### Step C: Parse files

Handled by `parseRepoFiles` in `parser.js`.

What happens:

- recursive walk with ignore filters,
- file-type classification (`code/docs/config`),
- file size filtering,
- binary filtering,
- priority sorting,
- project tree generation,
- parse stats generation.

Why:

- remove noisy files,
- prioritize high-signal content,
- capture structural context (tree).

### Step D: Index chunks

Handled by `indexRepoFiles` in `indexer.js`.

What happens:

- select splitter by file type and extension,
- chunk content with overlap,
- prepend contextual header to each chunk,
- attach metadata for filtering/grouping,
- insert tree as special document,
- batch upserts to Pinecone.

Why:

- preserve meaningful code boundaries,
- improve embedding context,
- enable secure per-user retrieval with metadata filter.

### Step E: Search

Handled by `searchGithubRepos` in `search.js`.

What happens:

- enforce enabled repo list,
- dual filter (`repo` IN enabled + `userId` EQ current user),
- score-threshold filtering,
- optional project-tree retrieval,
- group chunks by file and sort by `chunkIndex`,
- return formatted markdown context.

Why:

- better relevance quality,
- prevent cross-user leakage,
- produce readable context for generation.

### Step F: Agent answering

Handled in `agent.js` (`runAgent`/`streamAgent`).

What happens:

- parallel retrieval (docs/web/devdocs/github as enabled),
- prompt assembly with GitHub context block,
- model invocation,
- generated response grounded in retrieved code snippets.

---

## 3. Module-by-Module Deep Dive

## 3.1 `fetcher.js` — GitHub Cloning

### `parseGitHubUrl()`

Actual code:

```js
export function parseGitHubUrl(input) {
  const trimmed = input
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");

  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/,
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      name: urlMatch[2],
      fullName: `${urlMatch[1]}/${urlMatch[2]}`,
    };
  }

  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      name: shortMatch[2],
      fullName: `${shortMatch[1]}/${shortMatch[2]}`,
    };
  }

  return null;
}
```

What it supports in code truth:

- `owner/repo`
- `https://github.com/owner/repo` (also optional protocol/www)

Important doc-vs-code conflict:

- docs mention SSH input support (`git@github.com:owner/repo.git`), but current regex does **not** parse SSH format.

### `fetchRepoInfo()`

Actual code:

```js
const res = await fetch(
  `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
  { headers: { Accept: "application/vnd.github.v3+json" } }
);
...
return {
  owner: data.owner.login,
  name: data.name,
  fullName: data.full_name,
  description: data.description || "",
  language: data.language || "",
  stars: data.stargazers_count || 0,
  defaultBranch: data.default_branch || "main",
  isPrivate: data.private,
  size: data.size * 1024,
};
```

Why this data:

- ownership and identity (`owner`, `name`, `fullName`),
- UI metadata (`description`, `language`, `stars`),
- branch selection for cloning (`defaultBranch`),
- policy checks (`isPrivate`, `size`).

### `cloneRepo()`

Actual code:

```js
const CLONE_TIMEOUT = 120_000;
...
await execFileAsync(
  "git",
  ["clone", "--depth", "1", "--branch", branch, "--single-branch", repoUrl, cloneDir],
  { timeout: CLONE_TIMEOUT }
);
```

Why this design:

- `--depth 1`: latest snapshot only, reduces transfer/storage.
- `--single-branch`: avoid extra branch history/data.
- `os.tmpdir()`: ephemeral location, simplifies cleanup and limits persistent disk growth.
- 120s timeout: avoids hanging ingestion worker for problematic repos/network.

### `cleanupClone()`

Actual code:

```js
export function cleanupClone(cloneDir) {
  try {
    if (cloneDir && fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`⚠️ Cleanup failed for ${cloneDir}:`, err.message);
  }
}
```

Why cleanup matters:

- frees temporary disk,
- minimizes exposure window of downloaded source,
- keeps server filesystem predictable under repeated indexing.

---

## 3.2 `parser.js` — File Analysis

### `walkDirectory()` traversal logic

Core logic:

```js
function walkDirectory(dir, baseDir, files = []) {
  if (files.length >= MAX_FILES_PER_REPO) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (files.length >= MAX_FILES_PER_REPO) break;

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      walkDirectory(path.join(dir, entry.name), baseDir, files);
    } else if (entry.isFile()) {
      ... classify ... size filter ... push
    }
  }
  return files;
}
```

Step-by-step:

1. Stop early at max file cap.
2. Read entries.
3. Skip ignored/hidden directories.
4. Recurse into allowed directories.
5. For files: classify; reject unknown, empty, or too-large files.
6. Collect normalized metadata (`relativePath`, `absolutePath`, `type`, `size`).

### `IGNORED_DIRS`

Important conflict:

- docs describe 13 ignored dirs,
- actual code contains a larger set (34 entries).

Actual code set includes:

```js
export const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "vendor",
  "venv",
  ".venv",
  "env",
  ".idea",
  ".vscode",
  ".vs",
  "coverage",
  ".nyc_output",
  "target",
  "bin",
  "obj",
  ".gradle",
  ".maven",
  "tmp",
  "temp",
  "cache",
  "logs",
  "log",
  ".tox",
  ".eggs",
]);
```

Why the core 13 common ones are ignored:

- `node_modules`: huge dependency vendor tree.
- `.git`: VCS internals, not app logic.
- `dist`/`build`/`out`: generated artifacts.
- `.next`/`.nuxt`: framework build outputs.
- `__pycache__`: Python bytecode caches.
- `vendor`: dependency vendoring.
- `.idea`/`.vscode`: editor metadata.
- `coverage`: test coverage output.
- `target`: build output in JVM/Rust ecosystems.

### `MAX_FILE_SIZE = 100KB`

From `config.js`:

```js
export const MAX_FILE_SIZE = 100 * 1024; // 100 KB
```

Applied in parser:

```js
if (stat.size > MAX_FILE_SIZE || stat.size === 0) continue;
```

Why:

- excludes oversized low-signal files (bundles, generated code, snapshots),
- controls chunk explosion and embedding cost.

Concrete examples:

- `src/auth/login.js` -> likely included (small code file).
- `bundle.min.js` (150KB) -> skipped by size.

### `isBinary()`

Actual code checks for null bytes in first 8KB (not 512 bytes):

```js
function isBinary(buffer) {
  const checkLength = Math.min(buffer.length, 8192);
  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}
```

Why null-byte heuristic:

- fast, practical binary detection,
- avoids useless embedding of binary data.

Doc-vs-code conflict:

- docs describe first 512 bytes; implementation uses up to 8192 bytes.

### `getFileType()`

Actual classification logic:

```js
function getFileType(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (IMPORTANT_FILES.has(basename)) {
    if (
      DOCS_EXTENSIONS.has(ext) ||
      basename === "LICENSE" ||
      basename === "LICENSE.txt"
    )
      return "docs";
    if (CODE_EXTENSIONS.has(ext)) return "code";
    return "config";
  }

  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (DOCS_EXTENSIONS.has(ext)) return "docs";
  if (CONFIG_EXTENSIONS.has(ext)) return "config";
  return null;
}
```

Concrete examples:

- `src/auth/login.js` -> `code`.
- `README.md` -> `docs` (important file + docs extension).
- `docker-compose.yml` -> `config` (important file; extension also config).
- `node_modules/lodash/index.js` -> skipped (ignored dir).

### `getLanguage()` mapping equivalent

There is no separate `getLanguage()` function in parser. Language is resolved in indexer using extension mapping from `EXT_LANGUAGE_MAP`.

Example mapping source (`config.js`):

```js
export const EXT_LANGUAGE_MAP = {
  ".js": "JavaScript",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".sql": "SQL",
  ...
};
```

### Priority sorting

Parser prioritization:

```js
const priorityOrder = (f) => {
  const bn = path.basename(f.absolutePath).toLowerCase();
  if (bn.startsWith("readme")) return 0;
  if (f.type === "docs") return 1;
  if (IMPORTANT_FILES.has(path.basename(f.absolutePath))) return 2;
  if (f.type === "config") return 3;
  return 4;
};
fileList.sort((a, b) => priorityOrder(a) - priorityOrder(b));
```

Why:

- readme/docs provide architecture and semantics early,
- important/config files reveal runtime/build/dependency shape,
- code still indexed, but after high-context files.

### `generateProjectTree()`

Actual function builds a text tree up to depth 5, with directory markers and ASCII drawing chars.

Why valuable:

- gives structure context to agent,
- supports architectural questions ("where are routes/controllers/hooks?").

---

## 3.3 `indexer.js` — Language-Aware Splitting and Embedding

### Why 3 chunk profiles

From `config.js`:

```js
export const CODE_CHUNK_SIZE = 3000;
export const CODE_CHUNK_OVERLAP = 500;
export const DOCS_CHUNK_SIZE = 2000;
export const DOCS_CHUNK_OVERLAP = 400;
export const CONFIG_CHUNK_SIZE = 1500;
export const CONFIG_CHUNK_OVERLAP = 200;
```

Rationale:

- code chunks are larger to keep full function/class blocks.
- docs chunks are medium to preserve paragraph continuity.
- config chunks are smaller because files are concise/structured.
- overlaps preserve context across chunk boundaries.

### Language-aware separators (5 requested languages)

Actual code maps separators by extension key, not language name:

```js
export const CODE_SEPARATORS = {
  ".py": ["\nclass ", "\ndef ", "\nasync def ", "\n\n", "\n", " "],
  ".go": ["\nfunc ", "\ntype ", "\npackage ", "\n\n", "\n", " "],
  ".rs": [
    "\nfn ",
    "\npub fn ",
    "\nimpl ",
    "\nstruct ",
    "\nenum ",
    "\nmod ",
    "\n\n",
    "\n",
    " ",
  ],
  ".java": [
    "\npublic ",
    "\nprivate ",
    "\nprotected ",
    "\nclass ",
    "\ninterface ",
    "\n\n",
    "\n",
    " ",
  ],
  default: [
    "\nfunction ",
    "\nclass ",
    "\nexport ",
    "\nconst ",
    "\nlet ",
    "\nvar ",
    "\n\n",
    "\n",
    " ",
  ],
};
```

Interpretation for requested languages:

- Python: explicit class/def boundaries.
- JavaScript: via `default` separators (`function`, `const`, `class`, etc.) for `.js`/`.ts` unless custom key exists.
- Go: explicit `func/type/package` boundaries.
- Rust: explicit `fn/pub fn/struct/impl` boundaries.
- SQL: no custom `.sql` separator list in current code; SQL currently falls back to `default` separators (doc mismatch).

### Header prepended before embedding

Actual chunk header format in code:

```js
const header = `## ${repoFullName} — ${file.path} [${language}] (chunk ${idx + 1}/${totalChunks})\n\n`;
```

Why prepend header:

- makes embedding text self-describing,
- improves retrieval precision by including repo/file/language/chunk position.

### Metadata fields per chunk

Actual metadata in code:

```js
metadata: {
  repo: repoFullName,
  userId: userIdStr,
  filePath: file.path,
  fileType: file.type,
  language,
  chunkIndex: idx,
  totalChunks,
  source: "github_repo",
}
```

Field purpose:

- `repo`: repo-level filter.
- `userId`: user isolation in shared namespace.
- `filePath`: grouping and citation path.
- `fileType`: distinguish code/docs/config/tree.
- `language`: readability and downstream formatting.
- `chunkIndex/totalChunks`: restore chunk ordering.
- `source`: system origin tag.

Important conflicts vs docs:

- docs use keys `file`, `type`, `source: github_repos`; code uses `filePath`, `fileType`, `source: github_repo`.

### Project tree special document

Actual tree doc:

```js
new Document({
  pageContent: `# Project Structure: ${repoFullName}\n\n\`\`\`\n${parsed.tree}\`\`\``,
  metadata: {
    repo: repoFullName,
    userId: userIdStr,
    filePath: "__PROJECT_TREE__",
    fileType: "tree",
    source: "github_repo",
  },
});
```

### Batch size 96

From config:

```js
export const BATCH_SIZE = 96;
```

Why batching matters:

- prevents oversized upsert payloads,
- stabilizes memory/network behavior,
- smooth progress reporting during indexing loops.

### `indexRepoFiles()` walkthrough

High-level flow in function:

1. Convert `userId` to string.
2. Define splitter factory by file type/extension.
3. Add project tree document first (if available).
4. For each file:
   - derive language via extension map,
   - split content,
   - create chunk headers,
   - push chunk docs with metadata.
5. Initialize Pinecone store (`github_repos` namespace).
6. `for` loop over docs in steps of 96, `addDocuments(batch)`.
7. return indexed chunk count.

---

## 3.4 `search.js` — Semantic Search Engine

### `searchGithubRepos(query, enabledRepos, userId, topK=10)`

Signature (default imported from config):

```js
export async function searchGithubRepos(query, enabledRepos, userId, topK = SEARCH_TOP_K)
```

And in config:

```js
export const SEARCH_TOP_K = 10;
export const SEARCH_SCORE_THRESHOLD = 0.25;
```

### Dual filter

Actual filter:

```js
const filter = {
  repo: { $in: enabledRepos },
  userId: { $eq: userIdStr },
};
```

Why dual filter:

- one shared namespace for all GitHub repos/users,
- `repo` constrains to selected repositories,
- `userId` enforces tenancy isolation.

### Fetch 20 then return 10?

Doc-vs-code conflict:

- docs describe `topK * 2` fetch then trim,
- current code fetches exactly `topK`:

```js
const rawResults = await store.similaritySearchWithScore(query, topK, filter);
```

So over-fetching strategy is **not** currently implemented.

### Score threshold 0.25

Actual filtering:

```js
.filter((r) => r.score >= SEARCH_SCORE_THRESHOLD);
```

Plain meaning:

- only keep results with at least moderate similarity signal.
- with normalized score representation in this stack, `0.25` is a permissive relevance floor to drop clearly weak matches.

### `similaritySearchWithScore` vs `similaritySearch`

GitHub search uses `similaritySearchWithScore` to enable thresholding and relevance labels; plain `similaritySearch` would not provide score for filtering.

### `groupByFile()` behavior

There is no standalone `groupByFile()` function name, but equivalent grouping logic exists inline:

```js
const fileGroups = new Map();
for (const r of fileResults) {
  const m = r.doc.metadata;
  const key = `${m.repo}:${m.filePath}`;
  if (!fileGroups.has(key)) fileGroups.set(key, []);
  fileGroups.get(key).push(r);
}
for (const [, group] of fileGroups) {
  group.sort((a, b) => (a.doc.metadata.chunkIndex || 0) - (b.doc.metadata.chunkIndex || 0));
  ...
}
```

Before/after effect:

- Before: independent ranked chunk hits across files.
- After: contiguous chunk flow per file, easier to read and reason over.

### `getProjectTree()` behavior

Doc conflict:

- docs describe a dedicated `getProjectTree()` helper.
- code does it inline using a fallback search:

```js
const treeSearch = await store.similaritySearchWithScore(
  "project structure file tree directory",
  1,
  { ...filter, fileType: { $eq: "tree" } },
);
```

### 8000ms timeout

Actual timeout guard:

```js
const TIMEOUT_MS = 8000;
...
return await Promise.race([searchPromise, timeoutPromise]);
```

Why longer than document search:

- GitHub context can involve larger candidate set and extra tree lookup path,
- repository code retrieval can be heavier than user document retrieval.

### `formatResults()` behavior

No standalone `formatResults()` function exists; formatting is inline. Output structure is:

- optional `### Project Overview` block,
- grouped sections per file:

```js
const header = `### [${m.repo} — ${m.filePath}] (${lang}, ${scoreLabel})`;
parts.push(`${header}\n${r.doc.pageContent}`);
```

Final return:

```js
return parts.join("\n\n---\n\n");
```

---

## 3.5 `routes.js` — API Endpoints

Actual mounted base path (from `server/index.js`):

```js
app.use("/api/github-repos", githubReposRouter);
```

So endpoint paths are:

1. `GET /api/github-repos/repos`
2. `POST /api/github-repos/add`
3. `DELETE /api/github-repos/remove/:id`
4. `POST /api/github-repos/reindex/:id`
5. `GET /api/github-repos/status/:id`
6. `GET /api/github-repos/my-prefs`
7. `PUT /api/github-repos/my-prefs`

Doc-vs-code conflict:

- requested `/api/github/...` routes are documentation aliases; implemented routes use `/api/github-repos/...`.

### Background ingestion pattern

Implemented in `runRepoIngestion(repoId, repoInfo, userId)`:

```js
db.prepare("UPDATE github_repos SET status = 'cloning' WHERE id = ?").run(repoId);
cloneDir = await cloneRepo(...);

db.prepare("UPDATE github_repos SET status = 'parsing' WHERE id = ?").run(repoId);
const parsed = parseRepoFiles(...);

db.prepare("UPDATE github_repos SET status = 'indexing' WHERE id = ?").run(repoId);
const chunkCount = await indexRepoFiles(...);

UPDATE github_repos SET status = 'ready', ...
```

Error path:

```js
UPDATE github_repos SET status = 'error', error_message = ?
```

Status lifecycle:
`pending -> cloning -> parsing -> indexing -> ready` (or `error`).

Important response behavior:

- docs say endpoint returns `202` immediately,
- current code returns success JSON with default HTTP 200, then starts background ingestion.

---

## 4. Data Isolation and Security

Three-layer model in implementation:

1. Namespace isolation

- All GitHub vectors stored in `github_repos` namespace.

2. Metadata tenant filter

- Every chunk stores `userId` metadata.
- Search always filters `userId` + selected `repo`.

3. Ownership controls in API

- list/prefs scoped to current user,
- delete checks `admin || added_by === currentUser`,
- status/reindex guarded by auth and role checks.

Comparison across systems:

| System       | Namespace      | User Isolation Method    |
| ------------ | -------------- | ------------------------ |
| Document RAG | `user_{id}`    | namespace-per-user       |
| DevDocs RAG  | `dev_docs`     | shared/global            |
| GitHub RAG   | `github_repos` | metadata `userId` filter |

Why metadata filter for GitHub RAG:

- supports many repos under one operational namespace,
- avoids namespace explosion,
- aligns with repo-level + user-level dual filtering.

---

## 5. System Limits (Each Explained)

### `MAX_REPOS_PER_USER = 20`

From config and enforced in add route.

Why:

- bounds per-user storage and indexing workload.
- prevents abuse and accidental over-ingestion.

If exceeded:

- API rejects add request with 400 and quota message.

### `MAX_FILES_PER_REPO = 500`

Applied during recursive walk.

Why:

- caps processing for huge repos,
- keeps indexing latency predictable.

Priority sorting ensures first 500 are high-value (readme/docs/important/config before remaining code).

### `MAX_FILE_SIZE = 100KB`

Applied before reading content.

Why:

- excludes minified bundles/generated artifacts/large data dumps,
- reduces noisy embeddings and cost.

### `CLONE_TIMEOUT = 120s`

Guard in `cloneRepo`.

Why:

- avoids worker lock-up on network or giant repos.

On timeout:

- clone fails, ingestion status becomes `error`, cleanup runs.

### `SEARCH_SCORE_THRESHOLD = 0.25`

Used in `search.js`.

Plain meaning:

- low-similarity matches are dropped; only moderately relevant chunks survive.

### `BATCH_SIZE = 96`

Used by indexer batching loop.

Why:

- practical payload size for stable Pinecone upserts and progress updates,
- avoids oversized single-call payloads.

Note:

- code does not explicitly document why 96 versus 100; likely conservative batching for reliability margin.

---

## 6. Integration With AI Agent

### Requested `search_github_repos` tool definition

Code-truth finding:

- there is **no** LangChain `tool(...)` definition named `search_github_repos` in current source.
- docs mention such a tool design, but implementation uses direct function call inside agent orchestration.

What exists instead:

- `searchGithubRepos(...)` imported in `server/agent.js` and executed conditionally when GitHub mode is on.

Decision flow in code:

1. User sends chat request with `githubReposMode` + `githubRepos` array.
2. In `server/index.js`, these flags are passed to `runAgent` / `streamAgent`.
3. In `server/agent.js`, retrieval runs in `Promise.all` and calls `searchGithubRepos`.
4. Search retrieves Pinecone context.
5. `buildSystemPrompt` appends "GitHub Repository Code Context".
6. Model generates response grounded by retrieved code excerpts.

Concrete end-to-end example:

- User: "How does the useEffect hook work in this codebase?"
- Chat payload includes enabled repos (example: `facebook/react`).
- Agent calls `searchGithubRepos("How does the useEffect hook work in this codebase?", ["facebook/react"], userId)`.
- Search returns grouped chunks from files such as `src/...` and optional tree context.
- Prompt includes those chunks.
- Assistant answers with file-aware explanation derived from retrieved code.

---

## 7. Strengths and Weaknesses

### Key strengths

- language-aware splitting by extension boundaries (especially Python/Go/Rust/etc),
- score threshold removes weak retrieval noise,
- per-file grouping + chunk sorting improves continuity,
- project tree context improves architectural understanding,
- rich headers in chunks improve embedding context,
- dual filter (`repo` + `userId`) gives practical multi-tenant isolation in shared namespace.

### Known limitations

- no incremental indexing; updates require full re-ingestion,
- private repositories currently rejected (no tokenized clone path yet),
- no advanced reranker beyond threshold filtering,
- embeddings use general text model (`llama-text-embed-v2`) not code-specialized model,
- no change/diff tracking between indexing runs,
- docs and implementation currently diverge in several details (route aliases, SSH parsing, score strategy, key names).

---

## Appendix: High-Value Code Truth Corrections vs Docs

1. URL parsing

- docs: supports SSH format.
- code: supports HTTPS + owner/repo only.

2. ignored dirs

- docs: 13 dirs.
- code: expanded list (34 entries).

3. binary detection

- docs: first 512 bytes.
- code: up to first 8192 bytes.

4. metadata keys

- docs: `file`, `type`, `source: github_repos`.
- code: `filePath`, `fileType`, `source: github_repo`.

5. search strategy

- docs: fetch `topK*2`, trim to `topK`, helper `groupByFile/getProjectTree/formatResults`.
- code: fetches `topK` directly; equivalent logic inline.

6. routes

- docs sometimes refer to `/api/github/...`.
- code mounts `/api/github-repos/...`.

7. tool abstraction

- docs describe LangChain tool `search_github_repos`.
- code uses direct function integration in agent pipeline.
