# 🚀 Production Deployment Readiness Report
**Project:** Agentic Personal Assistant  
**Date:** 2026-04-26  
**License:** MIT (tariqlabs)

---

## 1. Project Overview

| Field | Value |
|---|---|
| **Name** | `agentic-rag-video` (root), `server` + `client` monorepo |
| **Description** | AI-powered personal assistant with RAG (Retrieval-Augmented Generation), multi-provider LLM support, document ingestion, GitHub repo indexing, dev-docs search, web search, and streaming chat |
| **Language** | JavaScript (ES Modules throughout) |
| **Node.js** | Not pinned — needs `.nvmrc` or `engines` field |
| **Framework (Server)** | Express 4.18 |
| **Framework (Client)** | React 19.2 + Vite 7.2 + TailwindCSS 4.2 |
| **Type** | Full-stack monorepo web application (API + SPA) |
| **Architecture** | 2-tier: Express REST API → SQLite + Pinecone vector DB; React SPA proxied via Vite dev server |

---

## 2. Dependencies & Package Management

### Package Manager
- **npm** (lockfiles present in all three locations)

### Lock File Status
| Location | Lock File | Status |
|---|---|---|
| Root | `package-lock.json` (11 KB) | ✅ Present |
| Server | `package-lock.json` (195 KB) | ✅ Present |
| Client | `package-lock.json` (219 KB) | ✅ Present |

### Server Production Dependencies (28)

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18.2 | HTTP server |
| `cors` | ^2.8.6 | Cross-origin requests |
| `dotenv` | ^17.2.3 | Environment variables |
| `better-sqlite3` | ^12.6.2 | SQLite database (native addon) |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT auth |
| `multer` | ^2.0.0 | File uploads |
| `express-rate-limit` | ^8.2.1 | Rate limiting (**installed but NOT imported**) |
| `langchain` | ^1.2.16 | LLM orchestration |
| `@langchain/core` | ^1.1.30 | LangChain core |
| `@langchain/google-genai` | ^2.1.24 | Gemini provider |
| `@langchain/groq` | ^1.1.4 | Groq provider |
| `@langchain/openai` | ^1.2.3 | OpenAI/OpenRouter provider |
| `@langchain/pinecone` | ^1.0.1 | Pinecone vector store |
| `@langchain/tavily` | ^1.2.0 | Tavily web search |
| `@langchain/community` | ^1.0.11 | Community integrations |
| `@langchain/langgraph` | ^1.1.4 | Agent graph |
| `@langchain/langgraph-checkpoint` | ^1.0.0 | Checkpoint storage |
| `@langchain/textsplitters` | ^0.1.0 | Text chunking |
| `@pinecone-database/pinecone` | ^5.1.2 | Pinecone client |
| `cheerio` | ^1.2.0 | HTML parsing (dev docs crawler) |
| `mammoth` | ^1.11.0 | DOCX parsing |
| `officeparser` | ^6.0.4 | Office doc parsing |
| `pdf-parse` | ^1.1.1 | PDF parsing |
| `p-limit` | ^7.3.0 | Concurrency limiter |
| `zod` | ^3.23.8 | Schema validation |

### Server Dev Dependencies
`eslint` ^9.17, `@eslint/js` ^9.17, `globals` ^15.14, `pdfkit` ^0.17.2, `prettier` ^3.4.2

### Client Production Dependencies (17)
`react` ^19.2, `react-dom` ^19.2, `react-router-dom` ^7.13, `framer-motion` ^12.38, `lucide-react` ^1.7, `react-markdown` ^10.1, `react-syntax-highlighter` ^16.1, `recharts` ^3.7, `katex` ^0.16, `rehype-katex` ^7.0, `remark-gfm` ^4.0, `remark-math` ^6.0, `tailwindcss` ^4.2, `@tailwindcss/vite` ^4.2, `autoprefixer` ^10.4

### Client Dev Dependencies
`vite` ^7.2, `@vitejs/plugin-react` ^5.1, `eslint` ^9.39, `prettier` ^3.4, type packages

> [!WARNING]
> Both `server` and `client` have `"agentic-rag-video": "file:.."` as a dependency — a local file reference that will **break in production Docker builds**. This must be removed or replaced.

---

## 3. Environment & Configuration

### Required Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `GOOGLE_API_KEY` | ✅ Yes | Primary Gemini API key | `AIzaSy...` |
| `GOOGLE_API_KEY_2..6` | Optional | Additional Gemini keys for rotation | `AIzaSy...` |
| `GROQ_API_KEY` | ✅ Yes | Groq LLM provider (default provider) | `gsk_...` |
| `OPENROUTER_API_KEY` | Optional | OpenRouter multi-model access | `sk-or-v1-...` |
| `PINECONE_API_KEY` | ✅ Yes | Pinecone vector database | `pcsk_...` |
| `PINECONE_INDEX` | ✅ Yes | Pinecone index name | `agentic-rag` |
| `JWT_SECRET` | ✅ **Critical** | JWT signing secret | 64-char hex string |
| `TAVILY_API_KEY` | Optional | Web search feature | `tvly-...` |
| `LANGSMITH_TRACING` | Optional | LangSmith observability toggle | `true`/`false` |
| `LANGSMITH_API_KEY` | Optional | LangSmith API key | `lsv2_...` |
| `LANGSMITH_ENDPOINT` | Optional | LangSmith endpoint | `https://api.smith.langchain.com` |
| `LANGSMITH_PROJECT` | Optional | LangSmith project name | `agentic-rag` |

### Config Files
| File | Location | Status |
|---|---|---|
| `.env` | `server/.env` | ✅ Exists (gitignored) |
| `.env.example` | `server/.env.example` | ✅ Exists |

> [!CAUTION]
> **CRITICAL: The actual `.env` file contains REAL API keys committed in the working tree.** All 6 Gemini keys, Groq key, OpenRouter key, Pinecone key, JWT secret, Tavily key, and LangSmith key are exposed. **These must be rotated immediately.**

> [!WARNING]
> **JWT_SECRET fallback:** Both `auth.js` and `middleware.js` use `process.env.JWT_SECRET || "change-this-secret-in-production"` — if the env var is missing, the app runs with a **hardcoded insecure secret**.

---

## 4. Build Process

### Client Build
```bash
cd client && npm run build    # → vite build
```
- **Output directory:** `client/dist/`
- **Build tool:** Vite 7.2 with React plugin + TailwindCSS plugin
- **Code splitting:** Custom `manualChunks` for vendor bundles (motion, markdown, code, icons)
- **Pre-existing `dist/`:** Yes, a build output already exists

### Server Build
- **No build step** — runs directly with `node index.js`
- **Native addon:** `better-sqlite3` requires C++ compilation (node-gyp)

### Install Commands
```bash
npm run install:all
# Runs: npm install && npm --prefix server install --legacy-peer-deps && npm --prefix client install --legacy-peer-deps
```

### Scripts Summary
| Script | Command | Location |
|---|---|---|
| `dev` | Runs server + client concurrently | Root |
| `dev:server` | `node index.js` | Root → Server |
| `dev:client` | `vite` | Root → Client |
| `start` | `node index.js` | Server |
| `build` | `vite build` | Client |
| `lint` | ESLint + Prettier | Root (both) |

---

## 5. Runtime Requirements

| Requirement | Value |
|---|---|
| **Server Port** | `3001` (hardcoded in `index.js` line 805) |
| **Client Dev Port** | `5173` (Vite default), proxies `/api` → `localhost:3001` |
| **Min RAM** | ~512 MB (SQLite + Node.js + LangChain), recommend 1 GB+ |
| **CPU** | 1 vCPU minimum, 2 recommended |
| **OS** | Any (Node.js), but `better-sqlite3` needs build tools on Linux |
| **System Dependencies** | `python3`, `make`, `g++` (for `better-sqlite3` native compilation) |
| **Network** | Outbound HTTPS to: Gemini API, Groq API, OpenRouter API, Pinecone API, Tavily API, LangSmith API, GitHub API, various docs sites |

> [!IMPORTANT]
> The server port `3001` is **hardcoded** — should be `process.env.PORT || 3001` for cloud deployment.

---

## 6. Database & Storage

### Primary Database: SQLite (better-sqlite3)
| Detail | Value |
|---|---|
| **Engine** | better-sqlite3 ^12.6.2 |
| **File** | `server/app.db` (336 KB + WAL files ~4 MB) |
| **Journal Mode** | WAL (Write-Ahead Logging) |
| **Location** | Same directory as server code (hardcoded path) |

### Tables (7)
| Table | Purpose |
|---|---|
| `users` | User accounts (email, password hash, role, is_active) |
| `conversations` | Chat conversations with metadata |
| `messages` | Individual chat messages |
| `documents` | Uploaded document tracking |
| `prompts` | System prompt personas |
| `user_settings` | Per-user provider/model preferences |
| `dev_docs_packs` | Developer documentation packages |
| `dev_docs_user_prefs` | User documentation preferences |
| `github_repos` | Indexed GitHub repositories |
| `github_repos_user_prefs` | User repo preferences |

### Migration Strategy
- **Inline column-level migrations** in `db.js` using `PRAGMA table_info()` checks
- Includes a table-rebuild migration for `github_repos` unique constraint change
- **No versioned migration system** (no up/down, no migration history)

### Vector Database: Pinecone (Cloud)
- Stores document embeddings namespaced per user (`user_{id}`)
- Embedding model: `llama-text-embed-v2` (Pinecone-hosted)
- Used for: document RAG, dev-docs search, GitHub repo code search

### File Storage
- **Uploads:** `server/uploads/media/` (chat images/audio, max 10 MB)
- **Temp files:** `os.tmpdir()` for document ingestion (cleaned up after processing)
- **GitHub clones:** `server/githubRepos/` directory

> [!WARNING]
> **SQLite in production:** SQLite is single-writer and file-based. For multi-instance deployments, this **must** be replaced with PostgreSQL/MySQL, or use a single-instance constraint with persistent volume.

---

## 7. External Services & Integrations

| Service | Purpose | Required |
|---|---|---|
| **Google Gemini API** | LLM provider (6-key rotation) | Optional (fallback) |
| **Groq API** | Default LLM provider (Llama, Qwen, Kimi) | ✅ Yes (default) |
| **OpenRouter API** | Alternative LLM provider | Optional |
| **Pinecone** | Vector database for RAG | ✅ Yes |
| **Tavily API** | Web search feature | Optional |
| **LangSmith** | LLM observability/tracing | Optional |
| **GitHub API** | Public repo fetching (unauthenticated) | Optional |
| **Google Fonts** | Typography (Sora, Plus Jakarta Sans, JetBrains Mono) | Yes (CDN) |

### Provider Fallback Chain
The system has an automatic fallback: if the selected model fails (429/error), it tries every other model in sequence across all providers.

---

## 8. Containerization & Infrastructure

| Item | Status |
|---|---|
| **Dockerfile** | ❌ Does not exist |
| **Docker Compose** | ❌ Does not exist |
| **Kubernetes manifests** | ❌ None |
| **`.dockerignore`** | ❌ Does not exist |

### Recommended Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
RUN apk add --no-cache python3 make g++  # for better-sqlite3
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY server/ ./
COPY --from=client-build /app/client/dist ./public
RUN mkdir -p uploads/media
EXPOSE 3001
CMD ["node", "index.js"]
```

### Recommended Platform
- **Railway / Render / Fly.io** (single-instance due to SQLite)
- Alternatively: **VPS (DigitalOcean/Hetzner)** with PM2 for process management

---

## 9. CI/CD Readiness

| Item | Status |
|---|---|
| `.github/workflows/` | ❌ Does not exist |
| `.gitlab-ci.yml` | ❌ Does not exist |
| Test suite | ❌ **No tests exist** (no test scripts, no test files, no test framework) |
| Lint scripts | ✅ Available (`npm run lint`) |
| Format scripts | ✅ Available (`npm run format`) |

### Recommended CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm run install:all
      - run: npm run lint
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd client && npm ci --legacy-peer-deps && npm run build
```

---

## 10. Health & Observability

| Item | Status |
|---|---|
| **Health check endpoint** | ❌ None exists |
| **Readiness probe** | ❌ None |
| **Structured logging** | ❌ Uses `console.log/warn/error` with emoji prefixes |
| **Log format** | Plain text, no JSON structure |
| **Monitoring** | ❌ No APM/monitoring integration |
| **Error tracking** | ❌ No Sentry/Datadog/etc. |
| **LangSmith tracing** | ✅ Optional, configurable via env vars |
| **API Keys status endpoint** | ✅ `GET /api/keys-status` (diagnostic) |

### Recommended Health Endpoint
```js
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
```

---

## 11. Security Checklist

| Item | Status | Notes |
|---|---|---|
| **HTTPS/TLS** | ❌ Not configured | Must be handled by reverse proxy (nginx/Caddy) or platform |
| **CORS** | ⚠️ `app.use(cors())` — **allows ALL origins** | Must restrict to specific domains |
| **Rate limiting** | ⚠️ `express-rate-limit` is **installed but never imported or used** | Must implement on auth + chat endpoints |
| **Helmet (security headers)** | ❌ Not installed or used | Must add `helmet` middleware |
| **JWT secret** | ⚠️ Fallback to hardcoded insecure value | Must enforce via env var (crash if missing) |
| **Password hashing** | ✅ bcrypt with cost factor 10 | Good |
| **Input validation** | ⚠️ Minimal — basic null checks, no sanitization | Needs `zod` or `joi` on all inputs |
| **SQL injection** | ✅ Parameterized queries throughout | Good |
| **File upload limits** | ✅ 25 MB docs, 10 MB media with MIME filtering | Good |
| **Auth on routes** | ✅ `requireAuth` middleware on protected routes | Good |
| **Admin routes** | ✅ `requireAdmin` middleware | Good |
| **`is_active` enforcement** | ⚠️ Column exists but **NOT checked during login or auth** | Users can be "deactivated" but still use valid tokens |
| **Media endpoint auth** | ⚠️ `/api/media` served as public static files | Any URL = public access to uploaded media |
| **Exposed API keys in `.env`** | 🔴 **CRITICAL** — Real keys visible in working tree | Must rotate ALL keys immediately |

### npm audit Results
- **Moderate vulnerabilities found** in `@langchain/community` (SSRF in RecursiveUrlLoader)
- Multiple transitive `uuid` deprecation warnings across LangChain packages
- `@langchain/core` vulnerability has **no fix available** yet

---

## 12. Deployment Checklist

### ✅ Ready

- [x] Monorepo structure with clear server/client separation
- [x] Client builds successfully with Vite (dist/ exists)
- [x] Lock files present for deterministic installs
- [x] JWT-based authentication with bcrypt password hashing
- [x] SQL injection prevention (parameterized queries)
- [x] File upload validation with MIME type + size limits
- [x] Role-based access control (user/admin)
- [x] `.env.example` template exists
- [x] `.gitignore` properly excludes `.env` and `node_modules`
- [x] Multi-provider LLM fallback chain
- [x] Gemini key rotation with quota tracking
- [x] ESLint + Prettier configured
- [x] Vite code splitting optimized
- [x] LangSmith tracing optional but configurable

### ⚠️ Needs Attention Before Production

| Priority | Item | Effort |
|---|---|---|
| 🔴 Critical | **Rotate ALL exposed API keys** (Gemini ×6, Groq, OpenRouter, Pinecone, JWT, Tavily, LangSmith) | Small |
| 🔴 Critical | **Remove hardcoded JWT secret fallback** — crash if `JWT_SECRET` env missing | Small |
| 🔴 Critical | **Restrict CORS** to specific production domain(s) | Small |
| 🔴 Critical | **Remove `"agentic-rag-video": "file:.."`** from both package.json files | Small |
| 🟡 High | **Create Dockerfile** + `.dockerignore` | Medium |
| 🟡 High | **Add health check endpoint** (`/health` or `/api/health`) | Small |
| 🟡 High | **Implement rate limiting** (package installed, not used) | Small |
| 🟡 High | **Add `helmet`** for security headers | Small |
| 🟡 High | **Make server port configurable** (`process.env.PORT || 3001`) | Small |
| 🟡 High | **Serve client `dist/` as static files** from Express in production | Small |
| 🟡 High | **Enforce `is_active` check** in login and `requireAuth` middleware | Small |
| 🟡 High | **Protect `/api/media` endpoint** with auth + ownership check | Medium |
| 🟡 High | **Pin Node.js version** (add `engines` field + `.nvmrc`) | Small |
| 🟡 Medium | **Add test suite** (zero tests currently) | Large |
| 🟡 Medium | **Set up CI/CD pipeline** (GitHub Actions) | Medium |
| 🟡 Medium | **Implement structured logging** (pino/winston with JSON) | Medium |
| 🟡 Medium | **Add error tracking** (Sentry or equivalent) | Medium |
| 🟡 Medium | **Evaluate SQLite for production** — fine for single-instance, but plan migration path to PostgreSQL for scale | Large |
| 🟡 Medium | **Implement proper migration system** (replace inline column checks) | Medium |
| 🟢 Low | **Add input validation/sanitization** on all endpoints | Medium |
| 🟢 Low | **Split `server/index.js`** (808 lines) into route modules | Large |
| 🟢 Low | **Add `compression` middleware** for response compression | Small |
| 🟢 Low | **Configure production CSP headers** | Medium |

### Production-Readiness Score: **4/10**

The application is **functionally complete** with rich features, but lacks critical production infrastructure: no containerization, no CI/CD, no tests, no health checks, exposed secrets, open CORS, unused security middleware, and hardcoded configuration values.

> [!IMPORTANT]
> **Minimum viable production path:** Fix the 4 critical items + create Dockerfile + add health endpoint + configure port from env + serve static files = deployable on Railway/Render in ~2-3 hours of work.
