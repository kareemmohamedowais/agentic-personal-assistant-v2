import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * يحدد نوع الملف ويستخدم الـ loader المناسب
 * يُرجع مصفوفة من الـ Documents بتنسيق LangChain
 */
export async function loadDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return loadPDF(filePath);
    case ".docx":
      return loadDocx(filePath);
    case ".pptx":
      return loadPptx(filePath);
    case ".txt":
      return loadTxt(filePath);
    case ".csv":
      return loadCsv(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

// ─── PDF ─────────────────────────────────────────────────────
async function loadPDF(filePath) {
  const loader = new PDFLoader(filePath);
  return loader.load();
}

// ─── Word (.docx) ────────────────────────────────────────────
async function loadDocx(filePath) {
  const mammoth = await import("mammoth");
  const buffer = await readFile(filePath);
  const result = await mammoth.default.extractRawText({ buffer });
  const text = result.value;

  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in DOCX file");
  }

  return [
    {
      pageContent: text,
      metadata: { source: filePath, type: "docx" },
    },
  ];
}

// ─── PowerPoint (.pptx) ─────────────────────────────────────
async function loadPptx(filePath) {
  const officeparser = await import("officeparser");
  const text = await officeparser.default.parseOfficeAsync(filePath);

  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in PPTX file");
  }

  return [
    {
      pageContent: text,
      metadata: { source: filePath, type: "pptx" },
    },
  ];
}

// ─── Plain Text (.txt) ──────────────────────────────────────
async function loadTxt(filePath) {
  const text = await readFile(filePath, "utf-8");

  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in TXT file");
  }

  return [
    {
      pageContent: text,
      metadata: { source: filePath, type: "txt" },
    },
  ];
}

// ─── CSV ─────────────────────────────────────────────────────
async function loadCsv(filePath) {
  const text = await readFile(filePath, "utf-8");

  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in CSV file");
  }

  // نحوّل CSV لنص قابل للقراءة مع حفاظ على الهيكل
  return [
    {
      pageContent: text,
      metadata: { source: filePath, type: "csv" },
    },
  ];
}

/**
 * الأنواع المدعومة مع الـ MIME types
 */
export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt", ".csv"];

export const SUPPORTED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/csv",
];

export function isSupportedFile(mimetype, filename) {
  const ext = path.extname(filename || "").toLowerCase();
  return SUPPORTED_MIMES.includes(mimetype) || SUPPORTED_EXTENSIONS.includes(ext);
}
