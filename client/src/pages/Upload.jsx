import { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const { token } = useAuth();

  const addFiles = (incoming) => {
    const allowed = ['.pdf', '.docx', '.pptx', '.txt', '.csv'];
    const filtered = Array.from(incoming).filter(
      (f) => allowed.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...filtered.filter((f) => !names.has(f.name))];
    });
  };

  const removeFile = (name) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const uploadAll = async () => {
    if (!files.length) return;
    setUploading(true);
    setResults([]);

    const uploadResults = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "فشل الرفع");

        uploadResults.push({ name: file.name, status: "success" });
      } catch (err) {
        uploadResults.push({ name: file.name, status: "error", message: err.message });
      }
    }

    setResults(uploadResults);
    setFiles([]);
    setUploading(false);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
        <h1 className="text-white font-semibold text-base">رفع الملفات</h1>
        <p className="text-slate-400 text-xs mt-0.5">
          ارفع ملفاتك الخاصة بك لتدريب مساعدك الشخصي (PDF, Word, PowerPoint, TXT, CSV)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${dragOver
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/30"
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.pptx,.txt,.csv"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors ${dragOver ? "bg-indigo-600/30" : "bg-slate-800"
            }`}>
            <svg className={`w-7 h-7 transition-colors ${dragOver ? "text-indigo-400" : "text-slate-400"}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-white font-medium text-sm mb-1">
            {dragOver ? "أفلت الملفات هنا" : "اسحب وأفلت الملفات هنا"}
          </p>
          <p className="text-slate-500 text-xs">أو انقر لاختيار الملفات · PDF, DOCX, PPTX, TXT, CSV · حتى 25MB</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <span className="text-slate-300 text-sm font-medium">
                {files.length} ملف{files.length !== 1 ? "" : ""} محدد
              </span>
              <button
                onClick={() => setFiles([])}
                className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
              >
                مسح الكل
              </button>
            </div>
            <ul className="divide-y divide-slate-800">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-white text-sm truncate">{f.name}</p>
                    <p className="text-slate-500 text-xs">{formatSize(f.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(f.name)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700/50">
              <button
                onClick={uploadAll}
                disabled={uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-all duration-150 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جارٍ الرفع والمعالجة...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    رفع {files.length} ملف
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider px-1">نتيجة الرفع</h3>
            {results.map((r) => (
              <div
                key={r.name}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border text-sm ${r.status === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}
              >
                {r.status === "success" ? (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="truncate font-medium">{r.name}</span>
                {r.status === "success"
                  ? <span className="mr-auto text-xs opacity-80">تم الرفع بنجاح ✓</span>
                  : <span className="mr-auto text-xs opacity-80">{r.message}</span>
                }
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex gap-3">
          <svg className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-slate-300 text-sm font-medium mb-1">ملفاتك خاصة بك فقط</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              كل ملف ترفعه يتم تخزينه بشكل منفصل مرتبط بحسابك فقط. لا يستطيع أي مستخدم آخر الوصول إلى ملفاتك أو نتائج بحثها.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
