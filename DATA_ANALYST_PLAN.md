# 🧠 خطة تنفيذ AI Data Analyst Agent — خطة تفصيلية متكاملة

> **الهدف:** إضافة نظام تحليل بيانات ذكي (مثل Advanced Data Analysis في ChatGPT) داخل المشروع الحالي Agentic Personal Assistant.

---

## 📋 ملخص الوضع الحالي للمشروع

### البنية الحالية

| المكوّن      | التقنية                                         |
| ------------ | ----------------------------------------------- |
| Backend      | Express.js + SQLite (better-sqlite3) + Pinecone |
| Frontend     | React 19 + Vite + Tailwind CSS v4               |
| AI Providers | Gemini (6 keys) + Groq + OpenRouter             |
| AI Framework | LangChain.js                                    |
| Streaming    | SSE (Server-Sent Events)                        |
| Auth         | JWT (7 أيام) + bcryptjs                         |
| File Upload  | Multer (25MB max)                               |

### الميزات الموجودة

- ✅ RAG على ملفات المستخدم (PDF, DOCX, PPTX, TXT, CSV)
- ✅ RAG على Developer Docs (10 frameworks)
- ✅ RAG على GitHub Repos
- ✅ Streaming chat + Multi-modal (صور + صوت)
- ✅ Web Search (Tavily)
- ✅ Prompt Optimizer
- ✅ نظام شخصيات (Personas)
- ✅ Analytics + Admin Panel

---

## 🏗️ Architecture — النظام الجديد

```
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ DataAnalyst   │  │
                    │  │ Page          │  │
                    │  │               │  │
                    │  │ • Upload Area │  │
                    │  │ • Chat Panel  │  │
                    │  │ • Charts      │  │
                    │  │ • Data Grid   │  │
                    │  │ • Reports     │  │
                    │  └───────────────┘  │
                    └──────────┬──────────┘
                               │ REST + SSE
                    ┌──────────▼──────────┐
                    │   Express Server    │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ dataAnalyst/  │  │
                    │  │               │  │
                    │  │ • routes.js   │  │
                    │  │ • engine.js   │  │
                    │  │ • executor.js │  │
                    │  │ • charts.js   │  │
                    │  │ • insights.js │  │
                    │  │ • cleaner.js  │  │
                    │  │ • reporter.js │  │
                    │  └───────────────┘  │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ Python Sandbox│  │
                    │  │ (child_process│  │
                    │  │  + venv)      │  │
                    │  └───────────────┘  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Storage Layer     │
                    │                     │
                    │  • SQLite (metadata)│
                    │  • /uploads/datasets│
                    │  • /sandbox/scripts │
                    └─────────────────────┘
```

---

## 📁 هيكل الملفات الجديدة

```
server/
├── dataAnalyst/
│   ├── routes.js          # API endpoints للتحليل
│   ├── engine.js          # المحرك الرئيسي — يقرر أي tool يستخدم
│   ├── executor.js        # تنفيذ Python code في sandbox آمن
│   ├── datasetManager.js  # إدارة الـ datasets (رفع، قراءة، metadata)
│   ├── cleaner.js         # تنظيف البيانات تلقائياً
│   ├── charts.js          # توليد الرسوم البيانية
│   ├── insights.js        # توليد insights نصية ذكية
│   ├── reporter.js        # توليد تقارير (Markdown/HTML)
│   ├── sqlGenerator.js    # تحويل سؤال → SQL query
│   └── templates/         # Python script templates
│       ├── analyze.py
│       ├── clean.py
│       ├── chart.py
│       ├── forecast.py
│       └── stats.py
├── uploads/
│   ├── media/             # (موجود)
│   └── datasets/          # ← جديد: ملفات البيانات
├── sandbox/               # ← جديد: مجلد تنفيذ Python المعزول
│   ├── venv/              # Python virtual environment
│   ├── scripts/           # الأكواد المؤقتة
│   └── outputs/           # نتائج التنفيذ (charts, reports)

client/src/
├── pages/
│   └── DataAnalyst.jsx    # ← صفحة التحليل الجديدة
├── components/
│   ├── DatasetUploader.jsx    # رفع ملفات البيانات
│   ├── DataGrid.jsx           # عرض البيانات في جدول
│   ├── ChartRenderer.jsx      # عرض الرسوم البيانية
│   ├── AnalysisChat.jsx       # واجهة الدردشة التحليلية
│   ├── DatasetSummary.jsx     # ملخص Dataset تلقائي
│   ├── InsightCard.jsx        # بطاقة insight
│   ├── ReportViewer.jsx       # عرض التقارير
│   └── CodeExecutionBlock.jsx # عرض الكود + النتيجة
├── contexts/
│   └── DataAnalystContext.jsx # State management للتحليل
```

---

## 🗄️ Phase 1: Database Schema — الجداول الجديدة

### المدة المقدرة: يوم واحد

### 1.1 جدول `datasets`

```sql
CREATE TABLE IF NOT EXISTS datasets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    original_name   TEXT    NOT NULL,
    stored_name     TEXT    NOT NULL,          -- اسم الملف على الديسك
    file_size       INTEGER NOT NULL DEFAULT 0,
    file_type       TEXT    NOT NULL,          -- csv, xlsx, json, parquet
    row_count       INTEGER DEFAULT 0,
    column_count    INTEGER DEFAULT 0,
    columns_meta    TEXT,                      -- JSON: [{name, type, nullCount, uniqueCount}]
    summary_stats   TEXT,                      -- JSON: {mean, median, std...} لكل عمود
    status          TEXT    NOT NULL DEFAULT 'uploading'
                    CHECK(status IN ('uploading','processing','ready','error')),
    error_message   TEXT,
    created_at      TEXT    DEFAULT (datetime('now'))
);
```

### 1.2 جدول `analysis_sessions`

```sql
CREATE TABLE IF NOT EXISTS analysis_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    dataset_id      INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    title           TEXT    DEFAULT 'جلسة تحليل جديدة',
    status          TEXT    DEFAULT 'active'
                    CHECK(status IN ('active','completed','archived')),
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
);
```

### 1.3 جدول `analysis_executions`

```sql
CREATE TABLE IF NOT EXISTS analysis_executions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_query      TEXT    NOT NULL,           -- سؤال المستخدم
    generated_code  TEXT,                       -- كود Python المولّد
    execution_output TEXT,                      -- stdout/stderr
    result_type     TEXT,                       -- text, chart, table, report, error
    result_data     TEXT,                       -- JSON: البيانات الناتجة
    chart_path      TEXT,                       -- مسار الرسم البياني إن وجد
    execution_time  INTEGER DEFAULT 0,          -- بالمللي ثانية
    status          TEXT    DEFAULT 'pending'
                    CHECK(status IN ('pending','running','success','error')),
    created_at      TEXT    DEFAULT (datetime('now'))
);
```

### 1.4 إضافة في `db.js`

- إضافة الجداول الثلاثة في ملف `db.js` الحالي
- مع migrations للأعمدة المستقبلية

---

## 🐍 Phase 2: Python Execution Engine (Sandbox)

### المدة المقدرة: 2-3 أيام

### 2.1 `server/dataAnalyst/executor.js` — المحرك الأساسي

**المبدأ:** تنفيذ كود Python **في process منفصل** مع حماية أمنية صارمة.

```
Flow:
1. AI يولّد كود Python
2. الكود يُكتب في ملف مؤقت في /sandbox/scripts/
3. يُنفَّذ بـ child_process.spawn مع timeout + resource limits
4. stdout/stderr يُلتقط
5. الملفات الناتجة (charts) تُنسخ إلى /sandbox/outputs/
6. يُمسح الملف المؤقت
```

**حدود الأمان:**
| حد | القيمة |
|----|--------|
| Timeout | 30 ثانية max |
| Memory | 512MB max |
| File size output | 10MB max |
| Network | ممنوع (no network access) |
| File system | فقط /sandbox/ + /uploads/datasets/ |
| Imports المسموحة | pandas, numpy, matplotlib, seaborn, plotly, scikit-learn, scipy |
| Imports الممنوعة | os.system, subprocess, socket, requests, urllib, shutil.rmtree |

**آلية العمل:**

```javascript
// executor.js - pseudocode
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

const PYTHON_PATH = path.join(
  __dirname,
  "../../sandbox/venv/Scripts/python.exe",
); // Windows
const SCRIPTS_DIR = path.join(__dirname, "../../sandbox/scripts");
const OUTPUTS_DIR = path.join(__dirname, "../../sandbox/outputs");
const TIMEOUT_MS = 30000;

// قائمة imports ممنوعة
const BLOCKED_IMPORTS = [
  "os.system",
  "subprocess",
  "socket",
  "shutil.rmtree",
  "__import__",
  "eval(",
  "exec(",
  "compile(",
];

export async function executePython(code, datasetPath, userId) {
  // 1. فحص الكود لـ security violations
  // 2. إنشاء ملف script مؤقت مع wrapper
  // 3. تنفيذ بـ spawn مع timeout
  // 4. التقاط stdout + stderr + output files
  // 5. تنظيف
}
```

### 2.2 Setup Script — إنشاء بيئة Python

```bash
# setup-sandbox.sh (يُنفذ مرة واحدة)
python -m venv sandbox/venv
source sandbox/venv/bin/activate  # أو Scripts\activate على Windows

pip install pandas numpy matplotlib seaborn plotly scikit-learn scipy openpyxl pyarrow
```

**سيحتاج ملف `setup-sandbox.js`** لأتمتة إنشاء البيئة عند أول تشغيل.

### 2.3 Python Script Wrapper

كل كود مولّد يُغلف في wrapper:

```python
# wrapper.py — يُضاف تلقائياً حول كود المستخدم
import sys
import json
import pandas as pd
import numpy as np

# تحديد المسارات
DATASET_PATH = sys.argv[1]
OUTPUT_DIR = sys.argv[2]

# تحميل البيانات
df = pd.read_csv(DATASET_PATH)  # أو read_excel حسب النوع

# ═══ كود المستخدم هنا ═══
{USER_CODE}
# ═══ نهاية كود المستخدم ═══

# إخراج النتيجة كـ JSON
if 'result' in dir():
    if isinstance(result, pd.DataFrame):
        print("__RESULT_START__")
        print(result.to_json(orient='records', force_ascii=False))
        print("__RESULT_END__")
    elif isinstance(result, (dict, list)):
        print("__RESULT_START__")
        print(json.dumps(result, ensure_ascii=False, default=str))
        print("__RESULT_END__")
    else:
        print("__RESULT_START__")
        print(str(result))
        print("__RESULT_END__")
```

---

## 📂 Phase 3: Dataset Manager

### المدة المقدرة: 1-2 يوم

### 3.1 `server/dataAnalyst/datasetManager.js`

**الوظائف:**

```javascript
// 1. رفع وحفظ dataset
export async function uploadDataset(filePath, userId, originalName, fileSize)

// 2. قراءة metadata
export async function getDatasetMeta(datasetId, userId)

// 3. قراءة أول N صفوف (preview)
export async function previewDataset(datasetId, userId, rows = 20)

// 4. توليد summary تلقائي
export async function generateDatasetSummary(datasetId, userId)

// 5. حذف dataset
export async function deleteDataset(datasetId, userId)

// 6. قائمة datasets المستخدم
export function listUserDatasets(userId)
```

**أنواع الملفات المدعومة:**

| النوع               | المكتبة (Python)              | المكتبة (Node - preview فقط) |
| ------------------- | ----------------------------- | ---------------------------- |
| CSV                 | pandas.read_csv               | csv-parse (للمعاينة السريعة) |
| Excel (.xlsx, .xls) | pandas.read_excel + openpyxl  | xlsx / SheetJS               |
| JSON                | pandas.read_json              | native JSON.parse            |
| Parquet             | pandas.read_parquet + pyarrow | — (Python فقط)               |

**Auto Summary** — عند رفع الملف:

```python
# auto_summary.py — يُنفَّذ تلقائياً بعد الرفع
summary = {
    "rows": len(df),
    "columns": len(df.columns),
    "columns_info": [],
    "missing_values": {},
    "duplicates": int(df.duplicated().sum()),
    "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024:.1f} KB"
}

for col in df.columns:
    info = {
        "name": col,
        "dtype": str(df[col].dtype),
        "null_count": int(df[col].isnull().sum()),
        "unique_count": int(df[col].nunique()),
    }
    if pd.api.types.is_numeric_dtype(df[col]):
        info["stats"] = {
            "mean": round(float(df[col].mean()), 2),
            "median": round(float(df[col].median()), 2),
            "std": round(float(df[col].std()), 2),
            "min": float(df[col].min()),
            "max": float(df[col].max()),
        }
    summary["columns_info"].append(info)
```

### 3.2 Multer Config للـ Datasets

```javascript
const datasetUpload = multer({
  storage: multer.diskStorage({
    destination: DATASETS_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = [".csv", ".xlsx", ".xls", ".json", ".parquet"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(
      allowed.includes(ext) ? null : new Error("نوع الملف غير مدعوم"),
      allowed.includes(ext),
    );
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for datasets
});
```

---

## 🤖 Phase 4: AI Analysis Engine

### المدة المقدرة: 3-4 أيام

### 4.1 `server/dataAnalyst/engine.js` — الدماغ!

هذا أهم ملف — يربط الـ AI بالأدوات.

**المبدأ:**

1. يستقبل سؤال المستخدم + metadata الـ dataset
2. يرسل للـ AI مع system prompt خاص بالتحليل
3. الـ AI يقرر: هل يحتاج كود Python؟ chart؟ statistics؟ تنظيف؟
4. يُنفَّذ القرار
5. تُرجع النتيجة

```javascript
// engine.js
export async function analyzeQuery({
  userId,
  sessionId,
  datasetId,
  query,
  provider,
  model,
  userApiKeys,
}) {
  // 1. جلب metadata الـ dataset
  const dataset = getDatasetMeta(datasetId, userId);

  // 2. بناء system prompt خاص بالتحليل
  const systemPrompt = buildAnalysisPrompt(dataset);

  // 3. إرسال للـ AI
  const aiResponse = await invokeWithRetry(provider, model, { userApiKeys }, [
    new SystemMessage(systemPrompt),
    new HumanMessage(query),
  ]);

  // 4. تحليل رد الـ AI — هل يحتوي كود Python؟
  const { code, explanation, chartType } = parseAIResponse(aiResponse.content);

  // 5. تنفيذ الكود إن وجد
  let executionResult = null;
  if (code) {
    executionResult = await executePython(code, dataset.storedPath, userId);
  }

  // 6. دمج النتائج
  return {
    explanation,
    code,
    executionResult,
    chartType,
  };
}
```

### 4.2 System Prompt للتحليل

````
أنت محلل بيانات متخصص. لديك dataset بالمواصفات التالية:

## Dataset Info
- الاسم: {name}
- عدد الصفوف: {rows}
- عدد الأعمدة: {columns}
- الأعمدة: {columns_info}
- إحصائيات: {summary_stats}

## التعليمات
1. عندما يسأل المستخدم سؤالاً عن البيانات، قم بتوليد كود Python لتحليلها
2. ضع الكود داخل ```python ... ```
3. استخدم المتغير `df` للوصول للبيانات (مُحمّل مسبقاً)
4. خزّن النتيجة في متغير `result`
5. للرسوم البيانية: استخدم matplotlib واحفظ الصورة بـ plt.savefig(OUTPUT_DIR + '/chart.png')
6. أضف شرح نصي قبل الكود يوضح ما ستفعله
7. بعد الكود، أضف insights عن النتائج المتوقعة
8. أجب بنفس لغة المستخدم

## المكتبات المتاحة
pandas, numpy, matplotlib, seaborn, plotly, scikit-learn, scipy

## ممنوعات
- لا تستخدم os.system أو subprocess
- لا تحاول الوصول لملفات خارج مجلد البيانات
- لا تنفذ أي عمليات شبكية
````

### 4.3 تحليل رد الـ AI (Response Parser)

````javascript
// parseAIResponse.js
export function parseAIResponse(content) {
  // استخراج كود Python من بين ```python ... ```
  const codeMatch = content.match(/```python\n([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : null;

  // استخراج النص الشرحي (كل شيء خارج block الكود)
  const explanation = content.replace(/```python[\s\S]*?```/g, "").trim();

  // كشف نوع الرسم البياني
  const chartType = detectChartType(code);

  return { code, explanation, chartType };
}
````

---

## 📊 Phase 5: Visualization Engine

### المدة المقدرة: 2-3 أيام

### 5.1 Backend — `server/dataAnalyst/charts.js`

الـ charts تُولَّد بطريقتين:

**الطريقة 1: Server-side (Python + matplotlib/plotly)**

- الكود المولّد من AI يحفظ الرسم كصورة PNG/HTML
- الصور تُخدَم من `/api/data-analyst/outputs/`

**الطريقة 2: Client-side (Recharts — موجود بالفعل في المشروع!)**

- الـ AI يرجع بيانات JSON
- الـ Frontend يرسمها بـ Recharts

```javascript
// charts.js
export function generateChartData(executionResult, chartType) {
  // تحويل نتيجة Python إلى format يفهمه Recharts
  return {
    type: chartType, // bar, line, scatter, pie, heatmap, histogram
    data: executionResult.data, // [{x: ..., y: ...}, ...]
    config: {
      xAxis: executionResult.xLabel,
      yAxis: executionResult.yLabel,
      title: executionResult.title,
      colors: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"],
    },
  };
}
```

### 5.2 Frontend — `client/src/components/ChartRenderer.jsx`

استخدام **Recharts** (موجود بالفعل في `client/package.json`!):

```jsx
// أنواع الرسوم المدعومة:
// - BarChart    → أعمدة
// - LineChart   → خطوط
// - ScatterChart → نقاط
// - PieChart    → دائري
// - AreaChart   → مساحة
// - Histogram   → توزيع (BarChart مُعدَّل)
// - Heatmap     → خريطة حرارية (custom component)

// + دعم تصدير الرسم كصورة PNG
// + عرض بيانات Python matplotlib كصورة مباشرة
```

---

## 🧹 Phase 6: Data Cleaning Module

### المدة المقدرة: 1-2 يوم

### 6.1 `server/dataAnalyst/cleaner.js`

**العمليات التلقائية:**

```python
# clean.py — template
def auto_clean(df):
    report = {"actions": []}

    # 1. إزالة الصفوف المكررة
    dups = df.duplicated().sum()
    if dups > 0:
        df = df.drop_duplicates()
        report["actions"].append(f"حذف {dups} صف مكرر")

    # 2. معالجة القيم الفارغة
    for col in df.columns:
        null_count = df[col].isnull().sum()
        if null_count > 0:
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col].fillna(df[col].median(), inplace=True)
                report["actions"].append(f"ملء {null_count} قيمة فارغة في {col} بالوسيط")
            else:
                df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "N/A", inplace=True)
                report["actions"].append(f"ملء {null_count} قيمة فارغة في {col} بالقيمة الأكثر تكراراً")

    # 3. تصحيح أنواع البيانات
    for col in df.columns:
        if df[col].dtype == 'object':
            try:
                df[col] = pd.to_datetime(df[col])
                report["actions"].append(f"تحويل {col} إلى تاريخ")
            except:
                try:
                    df[col] = pd.to_numeric(df[col])
                    report["actions"].append(f"تحويل {col} إلى رقم")
                except:
                    pass

    # 4. كشف القيم الشاذة (Outliers)
    for col in df.select_dtypes(include=[np.number]).columns:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        outliers = ((df[col] < Q1 - 1.5 * IQR) | (df[col] > Q3 + 1.5 * IQR)).sum()
        if outliers > 0:
            report["actions"].append(f"اكتشاف {outliers} قيمة شاذة في {col}")

    return df, report
```

**يمكن للمستخدم:**

- تشغيل التنظيف التلقائي بزر واحد "🧹 تنظيف البيانات"
- أو طلب تنظيف محدد عبر Chat: "أزل الصفوف المكررة" / "املأ القيم الفارغة في عمود السعر"

---

## 🔍 Phase 7: Insight Generator

### المدة المقدرة: 1-2 يوم

### 7.1 `server/dataAnalyst/insights.js`

بعد كل تحليل، الـ AI يولد insights ذكية:

```javascript
export async function generateInsights(
  dataset,
  executionResult,
  provider,
  model,
  userApiKeys,
) {
  const insightPrompt = `
بناءً على نتيجة التحليل التالية:
${JSON.stringify(executionResult)}

والبيانات الأصلية:
- Dataset: ${dataset.originalName}
- الصفوف: ${dataset.rowCount}
- الأعمدة: ${dataset.columnCount}

قم بتوليد 3-5 insights (ملاحظات تحليلية) بالعربية بصيغة:
1. **العنوان**: الشرح المختصر
2. ...

ركز على:
- الاتجاهات (trends)
- القيم الشاذة (anomalies)
- الارتباطات (correlations)
- المقارنات المهمة
    `;

  const response = await invokeWithRetry(provider, model, { userApiKeys }, [
    new SystemMessage("أنت محلل بيانات خبير. ولّد insights مفيدة وواضحة."),
    new HumanMessage(insightPrompt),
  ]);

  return response.result.content;
}
```

---

## 📄 Phase 8: Report Generator

### المدة المقدرة: 1-2 يوم

### 8.1 `server/dataAnalyst/reporter.js`

```javascript
export async function generateReport(sessionId, userId, format = "markdown") {
  // 1. جلب كل التنفيذات في هذه الجلسة
  const executions = db
    .prepare(
      `
        SELECT * FROM analysis_executions
        WHERE session_id = ? AND user_id = ?
        ORDER BY created_at ASC
    `,
    )
    .all(sessionId, userId);

  // 2. جلب metadata الـ dataset
  const session = db.prepare(`...`).get(sessionId);
  const dataset = db.prepare(`...`).get(session.dataset_id);

  // 3. بناء التقرير
  let report = `# تقرير تحليل: ${dataset.original_name}\n\n`;
  report += `## ملخص البيانات\n`;
  report += `- الصفوف: ${dataset.row_count}\n`;
  report += `- الأعمدة: ${dataset.column_count}\n\n`;

  for (const exec of executions) {
    report += `## ${exec.user_query}\n\n`;
    if (exec.generated_code) {
      report += `\`\`\`python\n${exec.generated_code}\n\`\`\`\n\n`;
    }
    if (exec.result_data) {
      report += `### النتيجة\n${exec.result_data}\n\n`;
    }
    if (exec.chart_path) {
      report += `![Chart](${exec.chart_path})\n\n`;
    }
  }

  // 4. تحويل حسب الـ format
  if (format === "html") {
    return markdownToHtml(report);
  }
  return report; // markdown
}
```

---

## 🌐 Phase 9: API Endpoints

### المدة المقدرة: 1-2 يوم

### 9.1 `server/dataAnalyst/routes.js`

```
# ─── Dataset Management ───────────────────────────
POST   /api/data-analyst/datasets/upload      # رفع dataset جديد
GET    /api/data-analyst/datasets              # قائمة datasets المستخدم
GET    /api/data-analyst/datasets/:id          # تفاصيل dataset
GET    /api/data-analyst/datasets/:id/preview  # أول 20 صف
GET    /api/data-analyst/datasets/:id/summary  # ملخص إحصائي
DELETE /api/data-analyst/datasets/:id          # حذف dataset

# ─── Analysis ─────────────────────────────────────
POST   /api/data-analyst/analyze              # تحليل سؤال (blocking)
POST   /api/data-analyst/analyze/stream       # تحليل سؤال (SSE streaming)
POST   /api/data-analyst/smart-analyze        # تحليل شامل تلقائي
POST   /api/data-analyst/clean                # تنظيف dataset
POST   /api/data-analyst/execute              # تنفيذ كود Python مباشر

# ─── Sessions ─────────────────────────────────────
GET    /api/data-analyst/sessions             # قائمة جلسات التحليل
GET    /api/data-analyst/sessions/:id         # تاريخ جلسة محددة

# ─── Outputs ──────────────────────────────────────
GET    /api/data-analyst/outputs/:filename    # خدمة الرسوم/التقارير
POST   /api/data-analyst/report/:sessionId    # توليد تقرير

# ─── Insights ─────────────────────────────────────
GET    /api/data-analyst/insights/:datasetId  # insights لـ dataset
```

### 9.2 ربط الـ Routes في `server/index.js`

```javascript
import dataAnalystRouter from "./dataAnalyst/routes.js";
app.use("/api/data-analyst", dataAnalystRouter);
```

---

## 🎨 Phase 10: Frontend — واجهة المستخدم

### المدة المقدرة: 4-5 أيام

### 10.1 صفحة DataAnalyst.jsx — التصميم

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Data Analyst                              [Model ▾]  │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│  📁 Datasets         │  📈 Analysis                     │
│  ────────────────    │  ────────────────────────────    │
│  ▶ sales.csv ✓      │                                  │
│    customers.xlsx    │  ┌─ Dataset Summary ──────────┐  │
│    products.json     │  │ Rows: 1,500                │  │
│                      │  │ Columns: 12                │  │
│  [+ Upload Dataset]  │  │ Missing: 3.2%              │  │
│                      │  │ Duplicates: 0              │  │
│  ──────────────────  │  └────────────────────────────┘  │
│                      │                                  │
│  🧹 Quick Actions    │  ┌─ Data Preview ─────────────┐  │
│  ────────────────    │  │ [Table with first 20 rows] │  │
│  [Smart Analyze]     │  └────────────────────────────┘  │
│  [Clean Data]        │                                  │
│  [Generate Report]   │  ┌─ Chat ─────────────────────┐  │
│  [Auto Charts]       │  │ 👤: اعرض متوسط المبيعات   │  │
│                      │  │ 🤖: [كود Python]           │  │
│                      │  │     [نتيجة + رسم بياني]     │  │
│                      │  │     [Insights]              │  │
│                      │  └────────────────────────────┘  │
│                      │                                  │
│                      │  ┌─ Input ────────[Send]──────┐  │
│                      │  │ اكتب سؤالك عن البيانات...  │  │
│                      │  └────────────────────────────┘  │
└──────────────────────┴──────────────────────────────────┘
```

### 10.2 المكونات الرئيسية

**DatasetUploader.jsx:**

- Drag & Drop zone
- دعم CSV, Excel, JSON, Parquet
- Progress bar أثناء الرفع
- Auto-summary بعد الرفع

**DataGrid.jsx:**

- جدول بيانات تفاعلي
- Sorting + Filtering
- عرض أنواع البيانات
- تمييز القيم الفارغة والشاذة

**ChartRenderer.jsx:**

- Recharts لـ client-side charts
- `<img>` لـ server-side charts (matplotlib)
- دعم تكبير/تصغير
- زر تصدير كصورة PNG

**CodeExecutionBlock.jsx:**

- عرض كود Python مع syntax highlighting (CodeBlock.jsx موجود!)
- زر "تشغيل" لإعادة التنفيذ
- عرض مرئي لـ stdout/stderr
- عرض وقت التنفيذ

**AnalysisChat.jsx:**

- Similar to Chat.jsx الحالي ولكن مخصص للتحليل
- يعرض: نص + كود + charts + tables + insights
- SSE streaming للرد

### 10.3 DataAnalystContext.jsx

```jsx
// State:
// - datasets: []           — قائمة الـ datasets
// - activeDataset: null     — الـ dataset المختار
// - activeSession: null     — جلسة التحليل الحالية
// - analysisHistory: []     — تاريخ التحليلات
// - isAnalyzing: false      — حالة التحميل
// - summary: null           — ملخص الـ dataset
// - preview: null           — أول 20 صف

// Actions:
// - uploadDataset(file)
// - selectDataset(id)
// - analyze(query)
// - cleanDataset()
// - smartAnalyze()
// - generateReport(format)
// - deleteDataset(id)
```

### 10.4 إضافة Route + Sidebar

في `App.jsx`:

```jsx
<Route path="/data-analyst" element={<DataAnalyst />} />
```

في `Sidebar.jsx`:

```jsx
{ icon: "📊", label: "Data Analyst", path: "/data-analyst" }
```

---

## ⭐ Phase 11: Smart Analysis Mode

### المدة المقدرة: 2-3 أيام

**الميزة الأقوى** — المستخدم يرفع dataset ويكتب "حلل هذا الملف"

### 11.1 Flow

```
1. Dataset uploaded → auto summary
2. User: "حلل هذا الملف"
3. System runs sequential analysis:
   ├── Step 1: Data Quality Report
   │   → missing values, duplicates, dtypes
   ├── Step 2: Auto Clean (if needed)
   │   → fill nulls, remove dups, fix types
   ├── Step 3: Statistical Summary
   │   → mean, median, std, correlation matrix
   ├── Step 4: Auto Charts
   │   → detect best chart types per column
   │   → generate 3-5 key visualizations
   ├── Step 5: Trend Detection
   │   → time series analysis if dates found
   │   → growth rates, seasonality
   ├── Step 6: Anomaly Detection
   │   → outliers via IQR + Z-score
   └── Step 7: AI Insights
       → narrative summary of all findings
```

### 11.2 Streaming Smart Analysis

كل خطوة تُرسل عبر SSE:

```json
{"type": "step", "step": 1, "title": "تقرير جودة البيانات", "status": "running"}
{"type": "step_result", "step": 1, "data": {...}}
{"type": "step", "step": 2, "title": "تنظيف البيانات", "status": "running"}
{"type": "step_result", "step": 2, "data": {...}}
{"type": "chart", "chartType": "bar", "data": [...]}
{"type": "chart", "chartType": "line", "data": [...]}
{"type": "insight", "content": "المبيعات ارتفعت بنسبة 30%..."}
{"type": "done", "summary": "تم تحليل 1500 صف و12 عمود..."}
```

---

## 🗺️ Phase 12: Natural Language → SQL

### المدة المقدرة: 1-2 يوم

### 12.1 `server/dataAnalyst/sqlGenerator.js`

عندما يسأل المستخدم بلغة طبيعية، يُحوَّل إلى SQL query ثم يُنفَّذ على الـ DataFrame:

```python
# pandas supports SQL-like operations via pandasql
import pandasql as ps

query = """SELECT month, AVG(sales) as avg_sales
           FROM df
           GROUP BY month
           ORDER BY avg_sales DESC"""

result = ps.sqldf(query, locals())
```

**أو** بدون مكتبة إضافية باستخدام pandas مباشرة:

```python
# AI يحوّل السؤال إلى pandas operations
result = df.groupby('month')['sales'].mean().sort_values(ascending=False)
```

---

## 🔄 Phase 13: Integration مع النظام الحالي

### المدة المقدرة: 1-2 يوم

### 13.1 ربط Data Analyst بالـ Chat الحالي

**الخيار 1: صفحة منفصلة (مُقترح)**

- `/data-analyst` — صفحة مستقلة بتصميم مخصص

**الخيار 2: دمج في Chat الحالي**

- زر "📊 Data Mode" في Chat.jsx
- عند التفعيل، يُظهر panel جانبي للـ datasets

**أنصح بالخيار 1** لأنه:

- أسهل في التطوير
- UX أفضل (مساحة أكبر للرسوم والجداول)
- لا يُعقّد كود Chat.jsx الحالي

### 13.2 مشاركة Providers

النظام الجديد يستخدم **نفس** نظام الـ Providers الحالي:

- `invokeWithRetry` / `streamWithRetry` من `providers/index.js`
- نفس الـ models (Llama 3.3, Gemini, etc.)
- نفس الـ fallback chain
- نفس user API keys

### 13.3 مشاركة Auth

- نفس `requireAuth` middleware
- نفس JWT token
- نفس `req.user.userId`

---

## 📦 Phase 14: Dependencies الجديدة

### Backend (server/package.json)

```json
// لا حاجة لمكتبات Node جديدة كثيرة!
// Python يتكفل بالعمل الثقيل

// اختياري — لمعاينة CSV سريعة بدون Python:
"csv-parse": "^5.5.0"    // (اختياري)
"xlsx": "^0.18.5"        // (اختياري لمعاينة Excel)
```

### Python (sandbox/requirements.txt)

```
pandas==2.2.0
numpy==1.26.4
matplotlib==3.8.3
seaborn==0.13.2
plotly==5.18.0
scikit-learn==1.4.0
scipy==1.12.0
openpyxl==3.1.2
pyarrow==15.0.0
```

### Frontend (client/package.json)

```json
// recharts موجود بالفعل! ✅
// إضافات اختيارية:
"ag-grid-react": "^31.0.0"    // (اختياري — جدول بيانات متقدم)
// أو يمكن بناء جدول بسيط بـ Tailwind
```

---

## 🛡️ Phase 15: Security — الأمان

### المدة المقدرة: 1 يوم (مُتداخل مع الـ Phases الأخرى)

### 15.1 Python Sandbox Security

| الطبقة                | الحماية                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| **Code Scanning**     | فحص الكود قبل التنفيذ — reject أي `import os`, `subprocess`, `socket`, etc. |
| **Process Isolation** | تنفيذ بـ `child_process.spawn` مع UID/GID منفصل (Linux)                     |
| **Timeout**           | 30 ثانية max لكل تنفيذ                                                      |
| **Memory Limit**      | 512MB max                                                                   |
| **File System**       | فقط `/sandbox/` و `/uploads/datasets/` read-only                            |
| **Network**           | لا اتصال شبكي                                                               |
| **Output Size**       | 10MB max لكل تنفيذ                                                          |
| **Rate Limiting**     | 10 تنفيذات/دقيقة لكل مستخدم                                                 |

### 15.2 Input Validation

```javascript
// Blocked patterns in Python code
const BLOCKED_PATTERNS = [
  /import\s+os\b/,
  /from\s+os\s+import/,
  /import\s+subprocess/,
  /import\s+socket/,
  /import\s+shutil/,
  /__import__/,
  /eval\s*\(/,
  /exec\s*\(/,
  /compile\s*\(/,
  /open\s*\([^)]*['"]\s*\/(?!sandbox|uploads\/datasets)/, // block file access outside allowed dirs
  /os\.system/,
  /os\.popen/,
  /os\.exec/,
  /os\.spawn/,
  /os\.remove/,
  /os\.unlink/,
  /os\.rmdir/,
];
```

### 15.3 User Isolation

- كل مستخدم يخزن datasets في مجلد فرعي: `/uploads/datasets/{userId}/`
- كل تنفيذ Python في مجلد فرعي: `/sandbox/scripts/{userId}/{executionId}.py`
- لا يمكن للمستخدم الوصول لبيانات مستخدم آخر

---

## 📐 ترتيب التنفيذ (Implementation Order)

```
Phase  1: Database Schema                          ██░░░░░░░░  Day 1
Phase  2: Python Sandbox + Executor                ██████░░░░  Day 2-4
Phase  3: Dataset Manager                          ████░░░░░░  Day 5-6
Phase  4: AI Analysis Engine                       ████████░░  Day 7-10
Phase  5: Visualization (Recharts + matplotlib)    ██████░░░░  Day 11-13
Phase  6: Data Cleaning Module                     ████░░░░░░  Day 14-15
Phase  7: Insight Generator                        ████░░░░░░  Day 16-17
Phase  8: Report Generator                         ████░░░░░░  Day 18-19
Phase  9: API Endpoints                            ████░░░░░░  Day 20-21
Phase 10: Frontend (UI + Components)               ██████████  Day 22-26
Phase 11: Smart Analysis Mode                      ██████░░░░  Day 27-29
Phase 12: NL → SQL                                 ████░░░░░░  Day 30-31
Phase 13: Integration + Testing                    ████░░░░░░  Day 32-33
Phase 14: Security Hardening                       ██░░░░░░░░  Day 34
Phase 15: Polish + Documentation                   ██░░░░░░░░  Day 35
```

---

## 🔄 MVP (أقل ناتج قابل للتشغيل)

إذا أردت **البدء بأقل حد ممكن** ثم التوسع:

### MVP — الأساسيات فقط:

1. ✅ رفع CSV/Excel
2. ✅ عرض preview + summary تلقائي
3. ✅ Chat → AI يولد كود Python → يُنفَّذ → يرجع النتيجة نص
4. ✅ عرض charts (Recharts)
5. ✅ Security sandbox

### V2 — التوسع:

6. Data Cleaning Module
7. Smart Analysis Mode
8. Report Generation
9. Forecasting
10. NL → SQL

---

## ⚠️ أسئلة تحتاج إجابتك قبل البدء

### 1. بيئة Python

> **هل Python مُثبت على الخادم الذي سيشغّل المشروع؟**
> وما الإصدار؟ (يُفضل Python 3.10+)
> هل تريد أن يكون تثبيت Python تلقائياً كجزء من setup المشروع؟

### 2. حجم البيانات

> **ما أقصى حجم dataset تتوقع أن يرفعه المستخدم؟**
>
> - صغير: < 10MB (آلاف الصفوف) — بسيط
> - متوسط: 10-100MB (مئات الآلاف) — يحتاج optimization
> - كبير: > 100MB (ملايين) — يحتاج streaming + chunked processing
>   الحد الحالي للمشروع هو 25MB للملفات العادية.

### 3. Deployment

> **أين سيُنشر المشروع؟**
>
> - VPS (Linux) — أسهل لـ Python sandbox
> - Docker — مثالي للعزل
> - Shared hosting — صعب جداً للـ Python execution
> - Serverless (Vercel/Railway) — يحتاج approach مختلف
>   هذا يؤثر على تصميم Python Executor بشكل كبير.

### 4. Approach بديل للـ Python

> **هل تُفضل:**
>
> - **(A) Python sandbox محلي** — أقوى، يحتاج Python على الخادم
> - **(B) AI يولد الكود + Node.js ينفذ** — أسهل، لكن محدود (لا matplotlib/sklearn)
> - **(C) استخدام E2B.dev أو Code Interpreter API** — خدمة خارجية جاهزة، تكلفة شهرية
> - **(D) كل التحليل عبر AI فقط (بدون تنفيذ كود)** — أبسط بكثير، لكن أقل دقة

### 5. الرسوم البيانية

> **أيهما تُفضل:**
>
> - **(A) Recharts فقط (client-side)** — جميل وتفاعلي، لكن الـ AI يحتاج يرجع data بـ format محدد
> - **(B) matplotlib (server-side → صور PNG)** — أقوى، لكن صور ثابتة
> - **(C) كلاهما** — Recharts كـ default + matplotlib لـ complex charts

### 6. دمج أم صفحة منفصلة؟

> **هل تُريد:**
>
> - **(A) صفحة `/data-analyst` منفصلة** — تصميم مخصص، أوضح
> - **(B) دمج في Chat الحالي** — زر toggle لتفعيل "وضع التحليل"
> - **(C) كلاهما** — صفحة مخصصة + إمكانية تحليل بسيط من Chat

### 7. تقارير PDF

> **هل تحتاج تصدير تقارير PDF؟**
> إذا نعم، سنحتاج مكتبة مثل `puppeteer` أو `pdfkit` أو توليد PDF من Python.

### 8. Real-time Collaboration

> **هل يحتاج أكثر من مستخدم يعمل على نفس الـ dataset؟**
> أم كل مستخدم معزول تماماً (مثل النظام الحالي)؟

### 9. التخزين

> **هل تريد تخزين الـ datasets بشكل دائم أم مؤقت؟**
>
> - دائم: يبقى حتى المستخدم يحذفه
> - مؤقت: يُحذف بعد 24 ساعة أو بعد انتهاء الجلسة
> - هجين: يحتفظ بالـ metadata + results، يحذف الملف الأصلي بعد فترة

### 10. الأداء

> **هل تريد caching لنتائج التحليل؟**
> مثلاً: إذا المستخدم سأل نفس السؤال مرتين على نفس الـ dataset، هل نعيد التنفيذ أم نرجع النتيجة المخزنة؟

---

## 📝 ملاحظات مهمة

1. **Recharts موجود بالفعل** في `client/package.json` — ممتاز! لن نحتاج مكتبة رسوم جديدة.

2. **نظام الـ Providers جاهز** — نستخدم نفس `invokeWithRetry` و `streamWithRetry`.

3. **نمط الـ Routes موحد** — نتبع نفس pattern الموجود في `devDocs/routes.js` و `githubRepos/routes.js`.

4. **الـ Migration pattern موجود** — نضيف الجداول الجديدة في `db.js` بنفس الأسلوب.

5. **SSE streaming pattern موجود** — نستخدم نفس pattern في `POST /api/chat/stream`.

6. **CSV مدعوم جزئياً** — `documentLoader.js` يدعم CSV لكن كـ text (للـ RAG). النظام الجديد يحتاج قراءة CSV كـ structured data.

7. **الأمان أولوية** — Python execution هو أخطر جزء. يجب الـ sandbox يكون صلب.
