// ─── GitHub Repos — Parser (recursive file walker + content extraction) ──────
import fs from "node:fs";
import path from "node:path";
import {
  CODE_EXTENSIONS,
  DOCS_EXTENSIONS,
  CONFIG_EXTENSIONS,
  IMPORTANT_FILES,
  IGNORED_DIRS,
  MAX_FILES_PER_REPO,
  MAX_FILE_SIZE,
} from "./config.js";

/**
 * Check if a buffer looks like binary (has null bytes in first 8KB)
 */
function isBinary(buffer) {
  const checkLength = Math.min(buffer.length, 8192);
  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0) return true;
    // buffer[i]
    // قيمة byte (من 0 إلى 255)
    //Text files → نادر جدًا فيها 0
    //Binary files → فيها 0 كتير
  }
  return false;
}
//نتجاهله (images, pdfs, ZIP) لأنه مش قابل للمعالجة في RAG، وبيأثر سلباً على الأداء لو حاولنا نقرأه كـ text.

// * الدالة `isBinary` بتفحص أول جزء من الملف (8KB) وتشيك لو فيه **null bytes (القيمة 0)**؛ لو لقيتها تعتبر الملف Binary، غير كده Text.
// * أهميتها إنها تمنع قراءة ملفات غير قابلة للتحليل (زي الصور والملفات التنفيذية) وبالتالي تحافظ على **الأداء ودقة المعالجة** في أنظمة زي RAG.

/**
 * Determine file type based on extension and name
 * Returns "code" | "docs" | "config" | null
 */
function getFileType(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (IMPORTANT_FILES.has(basename)) {
    if (DOCS_EXTENSIONS.has(ext) || basename === "LICENSE" || basename === "LICENSE.txt")
      return "docs";
    if (CODE_EXTENSIONS.has(ext)) return "code";
    return "config";
  }

  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (DOCS_EXTENSIONS.has(ext)) return "docs";
  if (CONFIG_EXTENSIONS.has(ext)) return "config";

  return null;
}

/**
 * Recursively walk a directory and collect indexable files
 * Returns array of { relativePath, absolutePath, type, size }
 */
function walkDirectory(dir, baseDir, files = []) {
// dir → الفولدر الحالي اللي بنقرأ منه
// baseDir → الفولدر الأساسي (علشان نحسب relative path)
// files → array بنجمع فيه النتائج
  if (files.length >= MAX_FILES_PER_REPO) return files;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
   //readdirSync يجيب الملفات + الفولدرات
   // withFileTypes: true → يعرف هل file ولا folder

  for (const entry of entries) {
    if (files.length >= MAX_FILES_PER_REPO
      
    ) break;

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      //ندخل جوه الفولدر ونكرر نفس العملية
      walkDirectory(path.join(dir, entry.name), baseDir, files);
    } else if (entry.isFile()) {
      // absPath → المسار الكامل للملف
      const absPath = path.join(dir, entry.name);
      // نحسب المسار النسبي من baseDir، ونحول \ إلى / عشان التوافق بين الأنظمة
      const relPath = path.relative(baseDir, absPath).replace(/\\/g, "/");
      const fileType = getFileType(absPath);
      if (!fileType) continue;

      try {
        const stat = fs.statSync(absPath);
        if (stat.size > MAX_FILE_SIZE || stat.size === 0) continue;
        // إضافة الملف للنتائج
        files.push({
          relativePath: relPath,
          absolutePath: absPath,
          type: fileType,
          size: stat.size,
        });
      } catch {
        continue;
      }
    }
  }

  return files;
}

// [
//   {
//     relativePath: "src/index.js",
//     absolutePath: "...",
//     type: "code",
//     size: 2000
//   },
//   {
//     relativePath: "README.md",
//     absolutePath: "...",
//     type: "docs",
//     size: 1500
//   }
// ]
// * الدالة `walkDirectory` بتمشي بشكل recursive داخل كل مجلد في المشروع，
//  وتجمع فقط الملفات المهمة (كود/Docs/Config) مع فلترتها حسب الحجم والنوع，
//  وترجع قائمة جاهزة للمعالجة (زي chunking وRAG).


/**
 * Generate a project tree string (max 3 levels deep)
 */

function generateProjectTree(dir, prefix = "", depth = 0, maxDepth = 5) {
    //dir → الفولدر اللي بنولد له الشجرة
    //prefix → string بنستخدمه لتنسيق الشجرة (زي ├── و│)
    //depth → العمق الحالي في الشجرة
    //maxDepth → الحد الأقصى للعمق)

  if (depth >= maxDepth) return "";

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return "";
  }
  // Sort: folders first, then files, both alphabetically
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  let tree = "";
  // Filter out ignored directories and hidden files
  const filtered = entries.filter((e) => !IGNORED_DIRS.has(e.name) && !e.name.startsWith("."));
  // Generate tree lines
  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i];
    const isLast = i === filtered.length - 1;
    // create connector (├── for middle entries, └── for last entry)
    const connector = isLast ? "└── " : "├── ";
    // create child prefix (│   for middle entries,     for last entry)
    const childPrefix = isLast ? "    " : "│   ";
    // add line for current entry
    tree += `${prefix}${connector}${entry.name}${entry.isDirectory() ? "/" : ""}\n`;

    if (entry.isDirectory()) {
      tree += generateProjectTree(
        path.join(dir, entry.name),
        prefix + childPrefix,
        depth + 1,
        maxDepth
      );
    }
  }

  return tree;
}
// src/
// ├── components/
// │   ├── Header.js
// │   └── Footer.js
// ├── pages/
// │   └── Home.js
// └── index.js
// عرض repo structure
// إدخال للـ AI (context)

/**
 * Parse all indexable files from a cloned repo
 * @param {string} cloneDir - Path to cloned repo
 * @param {string} repoFullName - e.g. "facebook/react"
 * @param {function} onProgress - callback(parsed, total, phase)
 * @returns {{ files: Array, tree: string, stats: object }}
 */
// 
// {
//   files: [...],
//   tree: "...",
//   stats: {...}
// }
export function parseRepoFiles(cloneDir, repoFullName, onProgress) {
  // 1. Walk the directory to find all indexable files (code, docs, config)
  const fileList = walkDirectory(cloneDir, cloneDir);

  console.log(` [${repoFullName}] Found ${fileList.length} indexable files`);

  // 2. Generate project tree (5 levels deep) for context
  const tree = generateProjectTree(cloneDir);

  // 3. Read and parse files
  const parsedFiles = [];
  let totalSize = 0;

  // Sort: prioritize README, docs, config (package.json etc) first for better context
  const priorityOrder = (f) => {
    const bn = path.basename(f.absolutePath).toLowerCase();
    if (bn.startsWith("readme")) return 0;
    if (f.type === "docs") return 1;
    if (IMPORTANT_FILES.has(path.basename(f.absolutePath))) return 2;
    if (f.type === "config") return 3;
    return 4;
  };
  // File ordering helps the AI understand the project step-by-step 
  // (README → docs → important → config → code) 
  // building correct context before reading code.
  // This improves embedding quality, leading to more accurate retrieval and answers.

  fileList.sort((a, b) => priorityOrder(a) - priorityOrder(b));
  // README
  // docs
  // important
  // config
  // code
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    try {
      const buffer = fs.readFileSync(file.absolutePath);
      // isbinary function → ignore
      if (isBinary(buffer)) continue;

      //convert buffer to UTF-8 string
      const content = buffer.toString("utf-8");
      if (!content.trim()) continue;

      totalSize += file.size;
      parsedFiles.push({
        path: file.relativePath,
        content,
        type: file.type,
        size: file.size,
        repo: repoFullName,
      });

    // {
    //   path: "src/index.js",
    //   content: "...",
    //   type: "code",
    //   size: 1200,
    //   repo: "owner/repo"
    // }
      // onprogress callback → تحديث الواجهة أو اللوجز بحالة التقدم
      if (onProgress) onProgress(i + 1, fileList.length, "parsing");
      
    } catch {
      continue;
    }
  }

  const stats = {
    totalFiles: parsedFiles.length,
    totalSize,
    codeFiles: parsedFiles.filter((f) => f.type === "code").length,
    docsFiles: parsedFiles.filter((f) => f.type === "docs").length,
    configFiles: parsedFiles.filter((f) => f.type === "config").length,
  };

  console.log(
    ` [${repoFullName}] Parsed ${stats.totalFiles} files (${stats.codeFiles} code, ${stats.docsFiles} docs, ${stats.configFiles} config)`
  );

  return { files: parsedFiles, tree, stats };
}

// {
//   files: [...],   // كل الملفات الجاهزة للـ chunking
//   tree: "...",    // شكل المشروع
//   stats: {
//     totalFiles: 50,
//     codeFiles: 30,
//     docsFiles: 10,
//     configFiles: 10
//   }
// }


//  قراءة repo كامل
//  فلترة الملفات
//  ترتيب 
//  تجهيز data للـ AI