# شرح مبسّط ومفصّل لملفات GitHub RAG

الملف ده يشرح جزء GitHub RAG بالكامل بطريقة بسيطة، ملف بملف، وباللغة العملية.

الملفات المشروحة:

- server/githubRepos/config.js
- server/githubRepos/fetcher.js
- server/githubRepos/parser.js
- server/githubRepos/indexer.js
- server/githubRepos/search.js
- server/githubRepos/routes.js
- server/db.js (الجزء الخاص بـ GitHub RAG)
- server/agent.js (تكامل GitHub RAG مع الـ Agent)
- server/index.js (ربط الـ routes ومرور الفلاجز من الـ API)

---

## 1) الصورة الكبيرة: النظام بيشتغل إزاي؟

باختصار شديد:

1. المستخدم يضيف رابط repo.
2. السيرفر يعمل clone للـ repo مؤقتا.
3. السيرفر يقرأ الملفات المهمة فقط (ويتجاهل المجلدات الضخمة والملفات غير المفيدة).
4. يقسم المحتوى إلى chunks ذكية.
5. يحول كل chunk إلى vector ويخزنها في Pinecone.
6. عند السؤال، يعمل semantic search في repos المفعلة فقط للمستخدم.
7. النتائج ترجع للـ Agent كـ context، والـ Agent يرد بإجابة مبنية على الكود.

---

## 2) شرح config.js

الملف ده هو مركز الإعدادات والثوابت.

### أهم الثوابت

- `MAX_REPOS_PER_USER = 20`
  : أقصى عدد repos لكل مستخدم.

- `MAX_FILES_PER_REPO = 500`
  : أقصى عدد ملفات يتم فهرستها من repo واحد.

- `MAX_FILE_SIZE = 100 * 1024`
  : أي ملف أكبر من 100KB يتم تجاهله.

- `GITHUB_REPOS_NAMESPACE = "github_repos"`
  : namespace المستخدم في Pinecone.

### إعدادات التقطيع

- كود: `CODE_CHUNK_SIZE = 3000`, `CODE_CHUNK_OVERLAP = 500`
- Docs: `DOCS_CHUNK_SIZE = 2000`, `DOCS_CHUNK_OVERLAP = 400`
- Config: `CONFIG_CHUNK_SIZE = 1500`, `CONFIG_CHUNK_OVERLAP = 200`
- رفع على Pinecone بدفعات: `BATCH_SIZE = 96`

### إعدادات البحث

- `SEARCH_SCORE_THRESHOLD = 0.25`
  : أي نتيجة أقل من 0.25 تتشال.

- `SEARCH_TOP_K = 10`
  : عدد النتائج المطلوب في البحث.

### تقسيم حسب اللغة

- `CODE_SEPARATORS`
  : فواصل مختلفة حسب الامتداد (.py, .go, .rs...) علشان القطع تكون على حدود منطقية (function/class) بدل قطع عشوائي.

### خرائط الامتدادات

- `EXT_LANGUAGE_MAP`
  : يحول الامتداد لاسم لغة.
- `CODE_EXTENSIONS`, `DOCS_EXTENSIONS`, `CONFIG_EXTENSIONS`
  : يحدد نوع الملف.

### فلترة مهمة

- `IMPORTANT_FILES`
  : ملفات مهمة تتفهرس حتى لو الامتداد مش كفاية.
- `IGNORED_DIRS`
  : مجلدات يتم تجاهلها بالكامل زي node_modules و .git وغيرها.

### كود فعلي من config.js

```js
export const MAX_REPOS_PER_USER = 20;
export const MAX_FILES_PER_REPO = 500;
export const MAX_FILE_SIZE = 100 * 1024; // 100 KB

export const GITHUB_REPOS_NAMESPACE = "github_repos";
```

- ماذا يفعل؟
  يعرّف حدود النظام الأساسية (عدد repos والملفات والحجم) واسم namespace المستخدم في التخزين المتجهي.
- لماذا مهم؟
  لأنه يحكم استهلاك الموارد ويحافظ على ثبات الأداء ويمنع أي فوضى في تنظيم البيانات داخل Pinecone.

```js
export const CODE_CHUNK_SIZE = 3000;
export const CODE_CHUNK_OVERLAP = 500;
export const DOCS_CHUNK_SIZE = 2000;
export const DOCS_CHUNK_OVERLAP = 400;
export const CONFIG_CHUNK_SIZE = 1500;
export const CONFIG_CHUNK_OVERLAP = 200;
export const BATCH_SIZE = 96;
```

- ماذا يفعل؟
  يحدد طريقة تقطيع المحتوى لكل نوع ملف وحجم الدفعات عند الرفع.
- لماذا مهم؟
  لأنه يؤثر مباشرة على جودة الاسترجاع وسرعة الفهرسة وتكلفة العملية.

```js
export const SEARCH_SCORE_THRESHOLD = 0.25;
export const SEARCH_TOP_K = 10;
```

- ماذا يفعل؟
  يحدد أقل درجة قبول للنتيجة وعدد النتائج المسترجعة افتراضيًا.
- لماذا مهم؟
  لأنه يمنع النتائج الضعيفة من الوصول إلى الـ Agent ويحسن دقة الإجابات.

---

## 3) شرح fetcher.js

الملف ده مسؤول عن جلب الـ repo من GitHub.

### `parseGitHubUrl(input)`

وظيفتها:

- تستقبل الرابط المدخل من المستخدم.
- تدعم 3 أشكال عملية:
  - `owner/repo`
  - `github.com/owner/repo`
  - `https://github.com/owner/repo`
- ترجع:
  - `owner`
  - `name`
  - `fullName` بصيغة `owner/name`

لو الرابط غير صحيح ترجع `null`.

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

- ماذا يفعل؟
  ينظف رابط GitHub ويفككه إلى `owner/name` بصيغة موحدة.
- لماذا مهم؟
  لأن أي خطوة تالية (GitHub API أو clone) تعتمد على parsing صحيح للرابط.

### `fetchRepoInfo(owner, name)`

وظيفتها:

- تنادي GitHub API للحصول على معلومات المستودع.
- ترجع بيانات مهمة مثل:
  - الاسم الكامل
  - الوصف
  - اللغة الأساسية
  - النجوم
  - الفرع الافتراضي
  - هل repo خاص أم لا
  - الحجم

التعامل مع الأخطاء:

- 404 -> repo غير موجود أو خاص
- 403 -> rate limit من GitHub

```js
export async function fetchRepoInfo(owner, name) {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    { headers: { Accept: "application/vnd.github.v3+json" } },
  );

  if (!res.ok) {
    if (res.status === 404) throw new Error("المستودع غير موجود أو خاص");
    if (res.status === 403)
      throw new Error("تم تجاوز حد الطلبات لـ GitHub API، حاول لاحقاً");
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    defaultBranch: data.default_branch || "main",
    isPrivate: data.private,
  };
}
```

- ماذا يفعل؟
  يجلب بيانات المستودع من GitHub API ويتعامل مع أخطاء 404/403.
- لماذا مهم؟
  لأنه يتحقق من صلاحية المستودع قبل إدخاله في pipeline ويمنع فشل متأخر أثناء الفهرسة.

### `cloneRepo(owner, name, branch = "main")`

وظيفتها:

- تعمل shallow clone باستخدام:
  - `--depth 1`
  - `--single-branch`
- تحفظ النسخة في مجلد مؤقت داخل `os.tmpdir()`.
- فيها timeout = 120 ثانية.

ليه shallow clone؟

- أسرع بكثير.
- حجم أقل.
- مناسب للفهرسة.

```js
const CLONE_TIMEOUT = 120_000;

await execFileAsync(
  "git",
  [
    "clone",
    "--depth",
    "1",
    "--branch",
    branch,
    "--single-branch",
    repoUrl,
    cloneDir,
  ],
  { timeout: CLONE_TIMEOUT },
);
```

- ماذا يفعل؟
  ينفذ clone سريع (shallow + single-branch) بمهلة زمنية محددة.
- لماذا مهم؟
  لأنه يقلل وقت وحجم التحميل ويمنع تعليق المعالجة في repos كبيرة أو اتصال ضعيف.

### `cleanupClone(cloneDir)`

وظيفتها:

- تمسح مجلد الـ clone بعد انتهاء العملية (نجاح أو فشل).
- مهم لتوفير المساحة وتنظيف السيرفر.

```js
export function cleanupClone(cloneDir) {
  if (cloneDir && fs.existsSync(cloneDir)) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
  }
}
```

- ماذا يفعل؟
  يحذف مجلد الاستنساخ المؤقت بعد انتهاء العملية.
- لماذا مهم؟
  لأنه يمنع تراكم ملفات مؤقتة واستهلاك مساحة القرص بشكل غير ضروري.

---

## 4) شرح parser.js

الملف ده مسؤول عن قراءة repo وتحديد الملفات المفيدة للفهرسة.

### `isBinary(buffer)`

وظيفتها:

- تفحص أول جزء من الملف (حتى 8192 بايت).
- لو وجدت byte قيمته 0 تعتبر الملف binary.
- الملف binary يتم تجاهله.

```js
function isBinary(buffer) {
  const checkLength = Math.min(buffer.length, 8192);
  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}
```

- ماذا يفعل؟
  يكشف الملفات الثنائية عبر فحص وجود null byte في بداية الملف.
- لماذا مهم؟
  لأن الملفات الثنائية لا تفيد في embedding وقد تفسد جودة الفهرسة.

### `getFileType(filePath)`

وظيفتها:

- تحدد نوع الملف:
  - `code`
  - `docs`
  - `config`
  - أو `null` (غير مدعوم)

المنطق:

- لو الملف في `IMPORTANT_FILES` غالبا يقبل.
- وإلا يعتمد على الامتداد.

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

- ماذا يفعل؟
  يصنف الملف إلى `code/docs/config` حسب الاسم والامتداد.
- لماذا مهم؟
  لأن التصنيف هو الأساس لاختيار chunk strategy الصحيحة لاحقًا.

### `walkDirectory(dir, baseDir, files = [])`

وظيفتها:

- تمشي recursively داخل المجلد.
- تتجاهل:
  - المجلدات الموجودة في `IGNORED_DIRS`
  - المجلدات المخفية.
- لكل ملف:
  - تتحقق من النوع.
  - تتحقق من الحجم (<= 100KB).
  - تجمع بياناته لو مناسب.
- تقف عند `MAX_FILES_PER_REPO`.

```js
function walkDirectory(dir, baseDir, files = []) {
  if (files.length >= MAX_FILES_PER_REPO) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= MAX_FILES_PER_REPO) break;

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      walkDirectory(path.join(dir, entry.name), baseDir, files);
    }
  }

  return files;
}
```

- ماذا يفعل؟
  يمشي داخل المجلدات recursively مع احترام حدود الفهرسة وقواعد التجاهل.
- لماذا مهم؟
  لأنه يتحكم في نطاق البيانات الداخلة للنظام ويمنع إدخال ملفات noisy.

### `generateProjectTree(...)`

وظيفتها:

- تنتج شجرة نصية لهيكل المشروع حتى عمق 5.
- تستخدم في الشرح لاحقا داخل نتائج البحث.

### `parseRepoFiles(cloneDir, repoFullName, onProgress)`

دي الدالة الأساسية في الملف:

1. تجمع قائمة الملفات.
2. تولد project tree.
3. ترتب الملفات بالأولوية:
   - README أولا
   - docs
   - important files
   - config
   - الباقي
4. تقرأ المحتوى النصي وتتجاهل الفارغ والبناري.
5. ترجع:
   - `files`
   - `tree`
   - `stats` (عدد code/docs/config والحجم الإجمالي)

```js
export function parseRepoFiles(cloneDir, repoFullName, onProgress) {
  const fileList = walkDirectory(cloneDir, cloneDir);
  const tree = generateProjectTree(cloneDir);

  const parsedFiles = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const buffer = fs.readFileSync(file.absolutePath);
    if (isBinary(buffer)) continue;

    parsedFiles.push({
      path: file.relativePath,
      content: buffer.toString("utf-8"),
      type: file.type,
      size: file.size,
      repo: repoFullName,
    });

    onProgress?.(i + 1, fileList.length, "parsing");
  }

  return {
    files: parsedFiles,
    tree,
    stats: { totalFiles: parsedFiles.length },
  };
}
```

- ماذا يفعل؟
  ينفذ parsing كامل للملفات ويُرجع الملفات + الشجرة + الإحصائيات.
- لماذا مهم؟
  لأنه يجهز بيانات نظيفة ومنظمة لمرحلة indexing بدون هذا لا توجد vectors ذات جودة.

---

## 5) شرح indexer.js

الملف ده يحول الملفات المقروءة إلى chunks ثم vectors في Pinecone.

### `getGithubReposStore()`

وظيفتها:

- تعمل اتصال Pinecone مرة واحدة (مع cache).
- تستخدم:
  - namespace: `github_repos`
  - embeddings model: `llama-text-embed-v2`

```js
const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

cachedStore = await PineconeStore.fromExistingIndex(embeddings, {
  pineconeIndex: index,
  namespace: GITHUB_REPOS_NAMESPACE,
});
```

- ماذا يفعل؟
  ينشئ/يعيد استخدام Vector Store مربوط بـ namespace الصحيح.
- لماذا مهم؟
  لأنه يضمن أن الكتابة والقراءة تتم على نفس مساحة البيانات الخاصة بـ GitHub RAG.

### `indexRepoFiles(parsed, repoFullName, userId, onProgress)`

دي أهم دالة في الفهرسة.

تشتغل كده:

1. تختار splitter حسب نوع الملف:
   - docs -> chunk docs settings
   - config -> chunk config settings
   - code -> chunk code settings + separators حسب الامتداد

2. تضيف شجرة المشروع كـ document خاص (`filePath: "__PROJECT_TREE__"`).

3. لكل ملف:
   - تحدد اللغة من `EXT_LANGUAGE_MAP`.
   - تقسم المحتوى chunks.
   - تضيف header لكل chunk بالشكل:
     - repo
     - file
     - language
     - chunk index/total

4. تخزن metadata لكل chunk:

- `repo`
- `userId`
- `filePath`
- `fileType`
- `language`
- `chunkIndex`
- `totalChunks`
- `source`

5. ترفع على Pinecone على دفعات `BATCH_SIZE = 96`.

6. ترجع عدد الـ chunks المخزنة.

```js
for (const file of parsed.files) {
  const ext = path.extname(file.path).toLowerCase();
  const language = EXT_LANGUAGE_MAP[ext] || "Unknown";
  const splitter = getSplitter(file);
  const chunks = await splitter.splitText(file.content);

  for (let idx = 0; idx < chunks.length; idx++) {
    const header = `## ${repoFullName} — ${file.path} [${language}] (chunk ${idx + 1}/${chunks.length})\n\n`;
    allDocs.push(
      new Document({
        pageContent: header + chunks[idx],
        metadata: {
          repo: repoFullName,
          userId: userIdStr,
          filePath: file.path,
          fileType: file.type,
          language,
          chunkIndex: idx,
          totalChunks: chunks.length,
          source: "github_repo",
        },
      }),
    );
  }
}
```

- ماذا يفعل؟
  يقسم كل ملف إلى chunks ويضيف header + metadata لكل chunk.
- لماذا مهم؟
  لأن metadata والهيدر يحسنان جودة الاسترجاع ويجعلان النتائج قابلة للتتبع حسب الملف.

```js
for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
  const batch = allDocs.slice(i, i + BATCH_SIZE);
  await store.addDocuments(batch);
  onProgress?.(
    Math.min(i + BATCH_SIZE, allDocs.length),
    allDocs.length,
    "indexing",
  );
}
```

- ماذا يفعل؟
  يرفع chunks إلى Pinecone على دفعات ويبلغ التقدم أثناء الفهرسة.
- لماذا مهم؟
  لأن الرفع بالدفعات أكثر استقرارًا وأقل عرضة للأخطاء من الرفع مرة واحدة.

### `deleteRepoVectors(repoFullName, userId)`

وظيفتها:

- تمسح vectors الخاصة بـ repo + userId فقط.
- مهمة للعزل بين المستخدمين.

```js
await index.deleteMany({
  repo: { $eq: repoFullName },
  userId: { $eq: String(userId) },
});
```

- ماذا يفعل؟
  يحذف كل vectors الخاصة بـ repo معيّن لمستخدم معيّن.
- لماذا مهم؟
  لأنه يحافظ على العزل بين المستخدمين ويمنع حذف بيانات مستخدم آخر بالخطأ.

### `reindexRepo(...)`

وظيفتها:

- تحذف القديم ثم تعيد الفهرسة.

---

## 6) شرح search.js

الملف ده مسؤول عن البحث الدلالي في vectors.

### `getGithubReposStore()`

- نفس فكرة indexer: فتح اتصال Pinecone مع cache في namespace `github_repos`.

### `searchGithubRepos(query, enabledRepos, userId, topK = SEARCH_TOP_K)`

الخطوات:

1. لو لا يوجد repos مفعلة -> `null`.
2. timeout للحماية: 8000ms.
3. يبني filter مزدوج:
   - `repo` ضمن repos المفعلة
   - `userId` مطابق للمستخدم
4. ينفذ `similaritySearchWithScore(query, topK, filter)`.
5. يطبق threshold >= 0.25.
6. يفصل نتائج الشجرة عن نتائج الملفات.
7. لو لا توجد شجرة في النتائج يحاول يجلبها ببحث منفصل.
8. يجمع النتائج حسب الملف (`repo:filePath`).
9. يرتب chunks داخل كل ملف حسب `chunkIndex`.
10. يرجع context نصي منظم يدخل للـ Agent.

```js
const filter = {
  repo: { $in: enabledRepos },
  userId: { $eq: userIdStr },
};

const rawResults = await store.similaritySearchWithScore(query, topK, filter);

const scored = rawResults
  .map(([doc, score]) => ({ doc, score }))
  .filter((r) => r.score >= SEARCH_SCORE_THRESHOLD);
```

- ماذا يفعل؟
  يبني فلتر البحث ويطبق score threshold على النتائج.
- لماذا مهم؟
  لأنه يقلل الضوضاء ويرفع جودة الـ context الذي يدخل إلى الـ Agent.

```js
const fileGroups = new Map();
for (const r of fileResults) {
  const key = `${r.doc.metadata.repo}:${r.doc.metadata.filePath}`;
  if (!fileGroups.has(key)) fileGroups.set(key, []);
  fileGroups.get(key).push(r);
}
```

- ماذا يفعل؟
  يجمع النتائج حسب الملف بدل عرض chunks متفرقة.
- لماذا مهم؟
  لأنه يعطي للـ LLM سياقًا متصلًا أسهل للفهم والشرح.

ملاحظات مهمة:

- الكود الحالي يجلب `topK` مباشرة.
- ليست مطبقة حاليا فكرة fetch 20 ثم trim 10.

---

## 7) شرح routes.js

الملف ده API layer الخاص بـ GitHub RAG.

### تتبع التقدم

- `installProgress = new Map()`
  : يحفظ progress لكل repo أثناء ingest.

```js
const installProgress = new Map(); // repoFullName -> { progress, total, phase }
```

- ماذا يفعل؟
  يخزن حالة التقدم الحالية لكل repo أثناء ingestion.
- لماذا مهم؟
  لأنه يسمح بعرض status حيّ للمستخدم في واجهة الإدارة.

### `GET /repos`

- يرجع repos الخاصة بالمستخدم + حالة كل repo + تفضيلات التفعيل.

### `POST /add`

- يضيف repo جديد:
  - يتحقق من الرابط
  - يتحقق من limit المستخدم
  - يمنع التكرار
  - يجلب بيانات من GitHub
  - يضيف سجل DB بحالة pending
  - يشغل ingest في الخلفية

```js
router.post("/add", requireAuth, async (req, res) => {
  const parsed = parseGitHubUrl(req.body.url);
  const repoInfo = await fetchRepoInfo(parsed.owner, parsed.name);

  const result = db
    .prepare(
      `INSERT INTO github_repos (owner, name, full_name, description, language, stars, default_branch, status, added_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      repoInfo.owner,
      repoInfo.name,
      repoInfo.fullName,
      repoInfo.description,
      repoInfo.language,
      repoInfo.stars,
      repoInfo.defaultBranch,
      req.user.userId,
    );

  res.json({ ok: true, repoId: result.lastInsertRowid, repo: repoInfo });
  runRepoIngestion(result.lastInsertRowid, repoInfo, req.user.userId).catch(
    console.error,
  );
});
```

- ماذا يفعل؟
  ينفذ endpoint إضافة repo: يتحقق، يحفظ في DB، ثم يبدأ المعالجة بالخلفية.
- لماذا مهم؟
  لأنه يفصل بين استجابة الـ API السريعة والمعالجة الثقيلة دون حظر المستخدم.

### `runRepoIngestion(...)` (خلفية)

مسار المعالجة الكامل:

1. `cloning`
2. `parsing`
3. `indexing`
4. نجاح -> `ready` + تحديث file_count/chunk_count/total_size/indexed_at
5. فشل -> `error` + error_message
6. في كل الحالات -> cleanupClone

```js
db.prepare("UPDATE github_repos SET status = 'cloning' WHERE id = ?").run(
  repoId,
);
cloneDir = await cloneRepo(
  repoInfo.owner,
  repoInfo.name,
  repoInfo.defaultBranch,
);

db.prepare("UPDATE github_repos SET status = 'parsing' WHERE id = ?").run(
  repoId,
);
const parsed = parseRepoFiles(cloneDir, fullName, (progress, total, phase) => {
  installProgress.set(fullName, { progress, total, phase });
});

db.prepare("UPDATE github_repos SET status = 'indexing' WHERE id = ?").run(
  repoId,
);
const chunkCount = await indexRepoFiles(parsed, fullName, userId);
```

- ماذا يفعل؟
  يوضح انتقال الحالات بين cloning/parsing/indexing داخل worker الخلفي.
- لماذا مهم؟
  لأنه يجعل pipeline قابلة للمراقبة والتشخيص عند الخطأ.

### `DELETE /remove/:id`

- يحذف repo (بصلاحيات owner أو admin).
- لو ready يحذف vectors أولا.
- ثم يحذف من DB والتفضيلات.

### `POST /reindex/:id`

- Admin only.
- يعيد الحالة pending ويشغل ingest مرة أخرى.

### `GET /status/:id`

- يرجع status الحالي + progress.

### `GET /my-prefs`

- يرجع repos المفعلة للمستخدم.
- الافتراضي: كل repos الجاهزة مفعلة.

### `PUT /my-prefs`

- يحدث التفعيل/التعطيل للrepos.

---

## 8) شرح الجزء الخاص بـ GitHub RAG في db.js

الملف db.js يحتوي جداول كثيرة، لكن المهم لجزء GitHub RAG:

### جدول `github_repos`

يخزن:

- معلومات repo (owner/name/full_name)
- metadata (description/language/stars/default_branch)
- الحالة (pending/cloning/parsing/indexing/ready/error)
- إحصائيات (file_count/chunk_count/total_size)
- صاحب الإضافة (`added_by`)
- وقت الفهرسة والأخطاء

قيد مهم:

- `UNIQUE(full_name, added_by)`
  : نفس repo ممكن يتضاف من مستخدمين مختلفين بدون تعارض.

```sql
CREATE TABLE IF NOT EXISTS github_repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','cloning','parsing','indexing','ready','error')),
  file_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  added_by INTEGER REFERENCES users(id),
  UNIQUE(full_name, added_by)
);
```

- ماذا يفعل؟
  ينشئ جدول repos مع حالات الفهرسة وإحصائياتها ومالك كل repo.
- لماذا مهم؟
  لأنه المصدر الأساسي لحالة GitHub RAG في النظام.

### جدول `github_repos_user_prefs`

يخزن تفضيلات التفعيل لكل مستخدم لكل repo.

```sql
CREATE TABLE IF NOT EXISTS github_repos_user_prefs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_id INTEGER NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  enabled INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, repo_id)
);
```

- ماذا يفعل؟
  ينشئ جدول تفضيلات تفعيل/تعطيل repos لكل مستخدم.
- لماذا مهم؟
  لأنه يسمح بتحكم دقيق فيما يدخل البحث بدل البحث في كل repos دائمًا.

### Migration خاصة بـ github_repos

فيه migration ينقل من قيد قديم `UNIQUE(full_name)` إلى القيد الجديد `UNIQUE(full_name, added_by)`.

ده مهم جدا لعزل المستخدمين على مستوى قاعدة البيانات.

---

## 9) شرح التكامل في agent.js

الملف agent.js هو مكان تشغيل الـ LLM وتجميع الـ contexts.

### التكامل مع GitHub search

- يستورد:
  - `searchGithubRepos` من `./githubRepos/search.js`

### أين يتم البحث؟

داخل `runAgent` و `streamAgent`:

- إذا `githubReposMode` مفعل و`githubRepos` فيها عناصر
- يتم استدعاء `searchGithubRepos(finalMessage, githubRepos, userId)`

```js
githubReposMode && githubRepos.length > 0
  ? searchGithubRepos(finalMessage, githubRepos, userId).catch(() => null)
  : Promise.resolve(null);
```

- ماذا يفعل؟
  يشغل GitHub search فقط إذا mode مفعّل وفيه repos مختارة.
- لماذا مهم؟
  لأنه يمنع استعلامات غير لازمة ويوفر زمن وتكلفة التنفيذ.

### كيف يدخل في الـ prompt؟

في `buildSystemPrompt`:

- لو `githubReposContext` موجود
- يضيف قسم واضح بعنوان:
  - `## GitHub Repository Code Context`
- ويضع قواعد للرد (ذكر file path، إظهار كود حقيقي، ...)

```js
if (githubReposContext) {
  full += `\n\n## GitHub Repository Code Context\n...\n\n${githubReposContext}`;
}
```

- ماذا يفعل؟
  يحقن نتائج GitHub RAG داخل system prompt قبل التوليد.
- لماذا مهم؟
  لأنه يجعل الإجابة grounded في كود فعلي وليس معرفة عامة فقط.

يعني GitHub RAG ليس أداة مستقلة هنا، لكنه context source داخل orchestration الأساسي للـ agent.

---

## 10) شرح التكامل في index.js

index.js هو نقطة دخول الـ Express app.

### ربط routes

- يتم mount لـ GitHub routes هنا:
  - `app.use("/api/github-repos", githubReposRouter)`

```js
import githubReposRouter from "./githubRepos/routes.js";
app.use("/api/github-repos", githubReposRouter);
```

- ماذا يفعل؟
  يربط مسارات GitHub RAG داخل تطبيق Express الرئيسي.
- لماذا مهم؟
  لأنه بدون هذا الربط لن تصل أي طلبات Frontend إلى routes الخاصة بالميزة.

### تمرير flags من API للـ agent

في `/api/chat` و `/api/chat/stream`:

- يقرأ:
  - `githubReposMode`
  - `githubRepos`
- يطبق منطق `tag` (github/devdocs/document)
- يمرر القيم إلى `runAgent` أو `streamAgent`

```js
const requestedGithubReposMode =
  req.body.githubReposMode === true || req.body.githubReposMode === "true";

const answer = await runAgent({
  ...,
  githubReposMode: enforceSingleSource.githubReposMode,
  githubRepos: req.body.githubRepos || [],
});
```

- ماذا يفعل؟
  يمرر إعدادات GitHub RAG من API إلى agent runtime.
- لماذا مهم؟
  لأنه هو الجسر الفعلي الذي يربط خيار المستخدم في الواجهة بسلوك البحث داخل الـ Agent.

ده هو الجسر بين الـ Frontend والـ GitHub RAG فعليا.

---

## 11) مسار التنفيذ الكامل (عملي جدا)

1. Frontend يرسل `POST /api/github-repos/add`.
2. routes.js يعمل validate + insert DB + background ingest.
3. fetcher.js يعمل clone.
4. parser.js يقرأ الملفات المهمة وينتج tree + stats.
5. indexer.js يقسم ويخزن vectors في Pinecone.
6. status يتحول إلى ready.
7. المستخدم يسأل في chat مع `githubReposMode = true`.
8. index.js يمرر الفلاجز للـ agent.
9. agent.js يستدعي search.js.
10. search.js يرجع context مرتب بالملف.
11. agent يضيف context للـ system prompt ويولد إجابة مبنية على الكود.

---

## 12) أهم نقاط القوة الحالية

- فلترة قوية قبل الفهرسة (size/type/ignored dirs/binary).
- فصل واضح للمراحل (clone/parse/index).
- عزل المستخدمين عبر metadata (`userId`) + ownership في DB/API.
- context مفيد للـ LLM (project tree + file grouping + chunk ordering).
- قابلية إعادة فهرسة repo بسهولة.

---

## 13) نقاط يجب الانتباه لها

- البحث الحالي يجلب topK مباشرة، وليس topK\*2.
- parseGitHubUrl لا يدعم صيغة SSH حاليا.
- binary detection في الكود الحالي يفحص حتى 8KB.

---

## 14) خلاصة سريعة

جزء GitHub RAG في المشروع متكوّن من:

- إعدادات واضحة (config)
- جلب repo (fetcher)
- تحليل ذكي للملفات (parser)
- فهرسة vectors (indexer)
- بحث دلالي (search)
- API كاملة للإدارة (routes)
- تكامل كامل مع قاعدة البيانات (db)
- تكامل مباشر مع الـ Agent والـ Chat APIs (agent + index)

النتيجة: المستخدم يسأل عن كود repos الخاصة به، والنظام يرد بناء على محتوى فعلي مفهرس، مش مجرد تخمين.
