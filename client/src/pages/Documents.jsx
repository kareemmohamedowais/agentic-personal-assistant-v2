import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const FILE_ICONS = {
    pdf: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", label: "PDF" },
    docx: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400", label: "DOCX" },
    pptx: { bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-400", label: "PPTX" },
    txt: { bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400", label: "TXT" },
    csv: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", label: "CSV" },
};

const STATUS_CONFIG = {
    processing: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "جارٍ المعالجة", icon: "⏳" },
    ready: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "جاهز", icon: "✅" },
    error: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "خطأ", icon: "❌" },
};

function formatSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "Z");
    return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const { token } = useAuth();

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/documents", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setDocuments(Array.isArray(data) ? data : []);
        } catch {
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const deleteDocument = async (id) => {
        if (!confirm("هل أنت متأكد من حذف هذا الملف؟")) return;
        setDeleting(id);
        try {
            await fetch(`/api/documents/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setDocuments((prev) => prev.filter((d) => d.id !== id));
        } catch (err) {
            console.error("Failed to delete document:", err);
        } finally {
            setDeleting(null);
        }
    };

    const totalSize = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);
    const readyCount = documents.filter((d) => d.status === "ready").length;
    const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
                <h1 className="text-white font-semibold text-base">مستنداتي</h1>
                <p className="text-slate-400 text-xs mt-0.5">إدارة جميع الملفات المرفوعة في قاعدة معرفتك</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{documents.length}</p>
                                <p className="text-slate-500 text-xs">ملفات مرفوعة</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{readyCount}</p>
                                <p className="text-slate-500 text-xs">جاهزة للبحث</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{formatSize(totalSize)}</p>
                                <p className="text-slate-500 text-xs">الحجم الإجمالي</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
                    </div>
                )}

                {/* Empty state */}
                {!loading && documents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-medium text-base mb-1">لا توجد ملفات بعد</h3>
                        <p className="text-slate-400 text-sm max-w-xs">ارفع ملفاتك من صفحة "رفع الملفات" لتظهر هنا</p>
                    </div>
                )}

                {/* Documents list */}
                {!loading && documents.length > 0 && (
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                            <span className="text-slate-300 text-sm font-medium">
                                {documents.length} ملف · {totalChunks} جزء نصي
                            </span>
                            <button
                                onClick={fetchDocuments}
                                className="text-slate-500 hover:text-indigo-400 text-xs transition-colors flex items-center gap-1"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                تحديث
                            </button>
                        </div>

                        <ul className="divide-y divide-slate-800">
                            {documents.map((doc) => {
                                const fileConfig = FILE_ICONS[doc.file_type] || FILE_ICONS.txt;
                                const statusConfig = STATUS_CONFIG[doc.status] || STATUS_CONFIG.processing;

                                return (
                                    <li key={doc.id} className="flex items-center gap-3 px-4 py-3.5 group hover:bg-slate-800/30 transition-colors">
                                        {/* File icon */}
                                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${fileConfig.bg}`}>
                                            <span className={`text-xs font-bold ${fileConfig.text}`}>{fileConfig.label}</span>
                                        </div>

                                        {/* File info */}
                                        <div className="flex-1 overflow-hidden min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{doc.original_name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-slate-500 text-xs">{formatSize(doc.file_size)}</span>
                                                <span className="text-slate-700 text-xs">·</span>
                                                <span className="text-slate-500 text-xs">{doc.chunk_count} جزء</span>
                                                <span className="text-slate-700 text-xs">·</span>
                                                <span className="text-slate-500 text-xs">{formatDate(doc.created_at)}</span>
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shrink-0 ${statusConfig.bg}`}>
                                            <span>{statusConfig.icon}</span>
                                            <span className={statusConfig.text}>{statusConfig.label}</span>
                                        </div>

                                        {/* Delete button */}
                                        <button
                                            onClick={() => deleteDocument(doc.id)}
                                            disabled={deleting === doc.id}
                                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 disabled:opacity-50 transition-all p-1.5 rounded-lg hover:bg-red-500/10 shrink-0"
                                            title="حذف الملف"
                                        >
                                            {deleting === doc.id ? (
                                                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* Info box */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex gap-3">
                    <svg className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-slate-300 text-sm font-medium mb-1">الأنواع المدعومة</p>
                        <p className="text-slate-500 text-xs leading-relaxed">
                            PDF · Word (DOCX) · PowerPoint (PPTX) · TXT · CSV — يمكنك رفع أي من هذه الأنواع من صفحة "رفع الملفات"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
