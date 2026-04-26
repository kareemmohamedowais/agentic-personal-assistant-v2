import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import {
    AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const BAR_COLORS = ["#d4a853", "#2dd4bf", "#a78bfa", "#f87171", "#34d399", "#fbbf24"];

function StatCard({ icon, value, label, gradient }) {
    return (
        <div className="relative overflow-hidden rounded-2xl p-5 glass-card hover-lift">
            <div className={`absolute inset-0 opacity-10 bg-linear-to-br ${gradient}`} />
            <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: "rgba(212,168,83,0.06)", border: "1px solid rgba(212,168,83,0.08)" }}>
                    {icon}
                </div>
                <div>
                    <p className="text-3xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                </div>
            </div>
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-luxury rounded-xl px-3 py-2 shadow-xl">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{payload[0].value} رسالة</p>
        </div>
    );
}

export default function Analytics() {
    const [stats, setStats] = useState(null);
    const [range, setRange] = useState("30");
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/analytics", { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setStats(data);
        } catch (err) { console.error("Failed to fetch analytics:", err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    if (loading) {
        return (
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                <PageHeader title="الإحصائيات" description="لوحة تحليل استخدامك للتطبيق" icon="📈" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(212,168,83,0.3)", borderTopColor: "var(--gold)" }} />
                </div>
            </div>
        );
    }

    const userMessages = stats?.messageSplit?.find((m) => m.role === "user")?.count || 0;
    const aiMessages = stats?.messageSplit?.find((m) => m.role === "ai")?.count || 0;
    const chartData = (stats?.dailyMessages || []).slice(-Number(range)).map((d) => ({
        date: new Date(d.date).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
        count: d.count,
    }));
    const fileTypeData = (stats?.fileTypes || []).map((ft) => ({ name: ft.type.toUpperCase(), value: ft.count }));
    const maxFileTypeValue = Math.max(...fileTypeData.map((d) => d.value), 1);
    const rangeLabel = range === "7" ? "آخر 7 أيام" : range === "14" ? "آخر 14 يوم" : "آخر 30 يوم";

    return (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <PageHeader title="الإحصائيات" description="لوحة تحليل استخدامك للتطبيق" icon="📈"
                actions={
                    <div className="flex items-center gap-2">
                        <select value={range} onChange={(e) => setRange(e.target.value)}
                            className="rounded-xl px-2.5 py-1.5 text-xs input-luxury">
                            <option value="7">آخر 7 أيام</option>
                            <option value="14">آخر 14 يوم</option>
                            <option value="30">آخر 30 يوم</option>
                        </select>
                        <button onClick={fetchAnalytics}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all duration-300"
                            style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(212,168,83,0.2)"; e.currentTarget.style.color = "var(--gold)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            تحديث
                        </button>
                    </div>
                }
            />

            <div className="flex-1 w-full overflow-y-auto custom-scroll px-4 md:px-6 py-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard icon="💬" value={stats?.totalMessages || 0} label="إجمالي الرسائل" gradient="from-amber-500/20 to-yellow-500/20" />
                    <StatCard icon="📁" value={stats?.totalConversations || 0} label="المحادثات" gradient="from-teal-500/20 to-cyan-500/20" />
                    <StatCard icon="📄" value={stats?.totalDocuments || 0} label="الملفات" gradient="from-amber-600/20 to-orange-500/20" />
                    <StatCard icon="🧩" value={stats?.totalChunks || 0} label="أجزاء نصية" gradient="from-emerald-500/20 to-green-500/20" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8 glass-card p-5!">
                        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>الرسائل اليومية</h3>
                        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{rangeLabel}</p>
                        {chartData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#d4a853" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,168,83,0.06)" />
                                        <XAxis dataKey="date" tick={{ fill: "#5c5650", fontSize: 11 }} axisLine={{ stroke: "rgba(212,168,83,0.08)" }} tickLine={false} />
                                        <YAxis tick={{ fill: "#5c5650", fontSize: 11 }} axisLine={{ stroke: "rgba(212,168,83,0.08)" }} tickLine={false} allowDecimals={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="count" stroke="#d4a853" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>لا توجد بيانات كافية بعد</div>
                        )}
                    </div>

                    <div className="xl:col-span-4 glass-card p-5!">
                        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>أنواع الملفات</h3>
                        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>توزيع حسب النوع</p>
                        {fileTypeData.length > 0 ? (
                            <>
                                <div className="space-y-3 min-h-48">
                                    {fileTypeData.map((entry, index) => (
                                        <div key={entry.name}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{entry.name}</span>
                                                <span className="text-xs" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{entry.value}</span>
                                            </div>
                                            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${(entry.value / maxFileTypeValue) * 100}%`,
                                                        background: BAR_COLORS[index % BAR_COLORS.length],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>لا توجد ملفات بعد</div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
                    <div className="glass-card p-5!">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-lg">📊</span>
                            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>معدل الاستخدام</h3>
                        </div>
                        <p className="text-3xl font-bold" style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>{stats?.avgMessagesPerDay || 0}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>رسالة في اليوم (متوسط)</p>
                    </div>

                    <div className="glass-card p-5!">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-lg">💬</span>
                            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>تقسيم الرسائل</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>رسائلك</span>
                                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{userMessages}</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats?.totalMessages ? (userMessages / stats.totalMessages) * 100 : 0}%`, background: "var(--gradient-primary)" }} />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>ردود الذكاء الاصطناعي</span>
                                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{aiMessages}</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats?.totalMessages ? (aiMessages / stats.totalMessages) * 100 : 0}%`, background: "var(--gradient-accent)" }} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-5!">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-lg">ℹ️</span>
                            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>معلومات سريعة</h3>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                                <span style={{ color: "var(--text-secondary)" }}>إجمالي الملفات</span>
                                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{stats?.totalDocuments || 0} ملف</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: "var(--text-secondary)" }}>أجزاء نصية مُفهرسة</span>
                                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{stats?.totalChunks || 0} جزء</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: "var(--text-secondary)" }}>أنواع مدعومة</span>
                                <span className="font-medium" style={{ color: "var(--text-primary)" }}>PDF, DOCX, PPTX, TXT, CSV</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
