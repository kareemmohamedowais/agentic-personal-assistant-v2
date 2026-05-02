import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "app.db");

const db = new Database(DB_PATH);

// Enable WAL for better performance
db.pragma("journal_mode = WAL");

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    email     TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password  TEXT    NOT NULL,
    name      TEXT    NOT NULL,
    created_at TEXT   DEFAULT (datetime('now'))
  )
`);

// Conversations table
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL DEFAULT 'محادثة جديدة',
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  )
`);

// Messages table
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT    NOT NULL CHECK(role IN ('user','ai')),
    content         TEXT    NOT NULL,
    created_at      TEXT    DEFAULT (datetime('now'))
  )
`);

// Documents table — لتتبع الملفات المرفوعة
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename      TEXT    NOT NULL,
    original_name TEXT    NOT NULL,
    file_size     INTEGER NOT NULL DEFAULT 0,
    file_type     TEXT    NOT NULL DEFAULT 'pdf',
    chunk_count   INTEGER NOT NULL DEFAULT 0,
    status        TEXT    NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','ready','error')),
    created_at    TEXT    DEFAULT (datetime('now'))
  )
`);

// Prompts table — شخصيات الـ Agent
db.exec(`
  CREATE TABLE IF NOT EXISTS prompts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL,
    description   TEXT,
    system_prompt TEXT    NOT NULL,
    icon          TEXT    DEFAULT '🤖',
    is_default    INTEGER DEFAULT 0,
    created_at    TEXT    DEFAULT (datetime('now'))
  )
`);

// ─── Migrations ──────────────────────────────────────────────
const msgCols = db
  .prepare("PRAGMA table_info(messages)")
  .all()
  .map((c) => c.name);

if (!msgCols.includes("conversation_id")) {
  db.exec(
    "ALTER TABLE messages ADD COLUMN conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE"
  );
}
if (!msgCols.includes("media_type")) {
  db.exec("ALTER TABLE messages ADD COLUMN media_type TEXT DEFAULT NULL");
}
if (!msgCols.includes("media_url")) {
  db.exec("ALTER TABLE messages ADD COLUMN media_url TEXT DEFAULT NULL");
}

const convCols = db
  .prepare("PRAGMA table_info(conversations)")
  .all()
  .map((c) => c.name);

if (!convCols.includes("summary")) {
  db.exec("ALTER TABLE conversations ADD COLUMN summary TEXT DEFAULT NULL");
}
if (!convCols.includes("prompt_id")) {
  db.exec("ALTER TABLE conversations ADD COLUMN prompt_id INTEGER REFERENCES prompts(id)");
}
if (!convCols.includes("ai_provider")) {
  db.exec("ALTER TABLE conversations ADD COLUMN ai_provider TEXT DEFAULT 'gemini'");
}
if (!convCols.includes("ai_model")) {
  db.exec("ALTER TABLE conversations ADD COLUMN ai_model TEXT DEFAULT 'gemini-2.5-flash-lite'");
}
if (!convCols.includes("is_pinned")) {
  db.exec("ALTER TABLE conversations ADD COLUMN is_pinned INTEGER DEFAULT 0");
}
if (!convCols.includes("tags")) {
  db.exec("ALTER TABLE conversations ADD COLUMN tags TEXT DEFAULT NULL");
}

// ─── Users migrations ──────────────────────────────────────
const userCols = db
  .prepare("PRAGMA table_info(users)")
  .all()
  .map((c) => c.name);

if (!userCols.includes("role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
}
if (!userCols.includes("is_active")) {
  db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
}

// ─── User Settings table ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_provider  TEXT DEFAULT 'gemini',
    default_model     TEXT DEFAULT 'gemini-2.5-flash-lite',
    groq_api_key      TEXT DEFAULT NULL,
    openrouter_api_key TEXT DEFAULT NULL,
    auto_optimize     INTEGER DEFAULT 0,
    updated_at        TEXT DEFAULT (datetime('now'))
  )
`);

// ─── Developer Docs Helper tables ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS dev_docs_packs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    framework     TEXT    NOT NULL UNIQUE,
    display_name  TEXT    NOT NULL,
    icon          TEXT    DEFAULT '📦',
    version       TEXT,
    status        TEXT    NOT NULL DEFAULT 'available' CHECK(status IN ('available','installing','ready','error')),
    docs_url      TEXT,
    chunk_count   INTEGER DEFAULT 0,
    page_count    INTEGER DEFAULT 0,
    installed_at  TEXT,
    installed_by  INTEGER REFERENCES users(id),
    error_message TEXT,
    created_at    TEXT    DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS dev_docs_user_prefs (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    framework  TEXT    NOT NULL,
    enabled    INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, framework)
  )
`);

// ─── GitHub Repos Knowledge Tables ──────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS github_repos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    owner           TEXT    NOT NULL,
    name            TEXT    NOT NULL,
    full_name       TEXT    NOT NULL,
    description     TEXT,
    language        TEXT,
    stars           INTEGER DEFAULT 0,
    default_branch  TEXT    DEFAULT 'main',
    status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','cloning','parsing','indexing','ready','error')),
    file_count      INTEGER DEFAULT 0,
    chunk_count     INTEGER DEFAULT 0,
    total_size      INTEGER DEFAULT 0,
    added_by        INTEGER REFERENCES users(id),
    is_public       INTEGER DEFAULT 1,
    indexed_at      TEXT,
    error_message   TEXT,
    created_at      TEXT    DEFAULT (datetime('now')),
    UNIQUE(full_name, added_by)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS github_repos_user_prefs (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_id    INTEGER NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
    enabled    INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, repo_id)
  )
`);

// ─── github_repos migration: UNIQUE(full_name) → UNIQUE(full_name, added_by) ──
// Gives each user their own isolated copy of any repo.
try {
  const grIndexes = db.prepare("PRAGMA index_list(github_repos)").all();
  const hasOldUnique = grIndexes.some((idx) => {
    if (!idx.unique) return false;
    const info = db.prepare(`PRAGMA index_info(${idx.name})`).all();
    return info.length === 1 && info[0].name === "full_name";
  });

  if (hasOldUnique) {
    db.pragma("foreign_keys = OFF");
    db.exec(`
      CREATE TABLE github_repos_v2 (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        owner           TEXT    NOT NULL,
        name            TEXT    NOT NULL,
        full_name       TEXT    NOT NULL,
        description     TEXT,
        language        TEXT,
        stars           INTEGER DEFAULT 0,
        default_branch  TEXT    DEFAULT 'main',
        status          TEXT    NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending','cloning','parsing','indexing','ready','error')),
        file_count      INTEGER DEFAULT 0,
        chunk_count     INTEGER DEFAULT 0,
        total_size      INTEGER DEFAULT 0,
        added_by        INTEGER REFERENCES users(id),
        is_public       INTEGER DEFAULT 1,
        indexed_at      TEXT,
        error_message   TEXT,
        created_at      TEXT    DEFAULT (datetime('now')),
        UNIQUE(full_name, added_by)
      )
    `);
    db.exec("INSERT INTO github_repos_v2 SELECT * FROM github_repos");
    db.exec("DROP TABLE github_repos");
    db.exec("ALTER TABLE github_repos_v2 RENAME TO github_repos");
    db.pragma("foreign_keys = ON");
    console.log("✅ [db] Migrated github_repos: UNIQUE(full_name, added_by)");
  }
} catch (e) {
  console.error("⚠️ [db] github_repos migration failed:", e.message);
}

// ─── Default prompts (upsert by name) ────────────────────────────────────────
const defaultPrompts = [
  {
    name: "مساعد عام",
    description: "مساعد ذكي شامل يجيب على جميع الأسئلة",
    icon: "🤖",
    prompt: `You are an intelligent, versatile personal assistant with access to a knowledge base and web search.

BEHAVIOR:
- Always search the knowledge base first when the user asks a factual question.
- If the knowledge base has no relevant results, use web search to find up-to-date information.
- Be concise and direct — avoid unnecessary filler phrases.
- Structure long answers with headers and bullet points for readability.
- Always respond in the same language the user writes in (Arabic or English).

TONE: Helpful, professional, and friendly.`,
  },
  {
    name: "مطور برمجيات",
    description: "خبير برمجة ومراجعة كود",
    icon: "💻",
    prompt: `You are a senior software engineer with 10+ years of experience across multiple stacks.

EXPERTISE: JavaScript/TypeScript, Python, React, Node.js, databases (SQL & NoSQL), system design, DevOps.

BEHAVIOR:
- Always wrap code in fenced code blocks with the correct language tag (e.g. \`\`\`python).
- When reviewing code: identify bugs, suggest improvements, explain the root cause of each issue.
- When writing code: follow clean code principles, add brief comments for non-obvious logic.
- For architecture questions: present trade-offs and recommend the best approach for the given context.
- If a question is ambiguous, ask one clarifying question before answering.
- Respond in the same language the user writes in.`,
  },
  {
    name: "كاتب محتوى",
    description: "كاتب إبداعي ومحرر محترف",
    icon: "✍️",
    prompt: `You are a professional content writer and editor with expertise in digital marketing, journalism, and creative writing.

BEHAVIOR:
- Match the requested tone: formal, conversational, persuasive, or storytelling — always confirm if unclear.
- Structure content with a hook, body, and call-to-action where appropriate.
- Use active voice, vary sentence length, and avoid clichés.
- When editing user text: preserve their voice while improving clarity and flow. Mark substantial changes.
- Always deliver ready-to-publish content unless the user asks for a draft.
- Respond in the same language the user writes in.`,
  },
  {
    name: "مترجم",
    description: "مترجم محترف متعدد اللغات",
    icon: "🌐",
    prompt: `You are a professional translator with native-level fluency in Arabic, English, French, Spanish, and German.

BEHAVIOR:
- Translate accurately while preserving tone, register, and cultural nuances.
- If the target language is not specified, ask before translating.
- For technical or legal text: prioritize precision over flow and note any ambiguous terms.
- For literary or marketing text: prioritize natural-sounding output over literal accuracy.
- After translating, briefly note any cultural adaptations made (if any).
- Never add explanations unless the user asks for them — output the translation directly.`,
  },
  {
    name: "محلل بيانات",
    description: "خبير تحليل بيانات وإحصاءات",
    icon: "📊",
    prompt: `You are a senior data analyst with expertise in statistics, SQL, Python (pandas, matplotlib, seaborn), and business intelligence.

BEHAVIOR:
1. CLARIFY FIRST: Before analyzing, ask about data format, size, and the specific business question if not provided.
2. STRUCTURE: Present findings with: (a) Summary, (b) Key Insights, (c) Recommendations.
3. FORMATTING:
   - Always use markdown tables for tabular data.
   - Use code blocks for SQL queries, Python snippets, or formulas.
   - Suggest chart types for each finding (e.g. "a bar chart would show this clearly").
4. STATISTICS: Explain statistical results in plain language alongside the technical terms.
5. PROACTIVE: Suggest follow-up analyses the user may not have considered.
6. LIMITATIONS: Always note data quality issues, sample size concerns, or caveats.
- Respond in the same language the user writes in.`,
  },
];

const insertPrompt = db.prepare(
  `INSERT INTO prompts (user_id, name, description, system_prompt, icon, is_default) VALUES (NULL, ?, ?, ?, ?, 1)`
);
const updatePrompt = db.prepare(
  `UPDATE prompts SET description = ?, system_prompt = ?, icon = ? WHERE name = ? AND is_default = 1`
);
const existingNames = new Set(
  db
    .prepare("SELECT name FROM prompts WHERE is_default = 1")
    .all()
    .map((r) => r.name)
);

for (const p of defaultPrompts) {
  if (existingNames.has(p.name)) {
    updatePrompt.run(p.description, p.prompt, p.icon, p.name);
  } else {
    insertPrompt.run(p.name, p.description, p.prompt, p.icon);
  }
}

// ─── Seed default users if empty ──────────────────────────────
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
if (userCount === 0) {
  import("bcryptjs").then(async (bcrypt) => {
    const salt = await bcrypt.default.genSalt(10);
    
    // Create Admin
    const adminHash = await bcrypt.default.hash("admin123456", salt);
    db.prepare("INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, 1)")
      .run("Default Admin", "admin@admin.com", adminHash, "admin");
    
    // Create Regular User
    const userHash = await bcrypt.default.hash("user123456", salt);
    db.prepare("INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, 1)")
      .run("User Test", "user@test.com", userHash, "user");
      
    console.log("🎁 [db] Seeded default accounts: admin@admin.com & user@test.com");
  });
}

export default db;
