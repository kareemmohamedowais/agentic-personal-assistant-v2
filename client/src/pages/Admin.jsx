import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import SearchBar from "../components/SearchBar";
import PageHeader from "../components/PageHeader";

function GrowthSparkline({ data }) {
  if (!data?.length) {
    return (
      <div className="h-52 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        لا توجد بيانات كافية بعد
      </div>
    );
  }

  const width = 720;
  const height = 200;
  const paddingX = 16;
  const paddingY = 16;

  const values = data.map((d) => d.total);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const xStep = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;

  const points = data
    .map((d, i) => {
      const x = paddingX + i * xStep;
      const norm = (d.total - minVal) / Math.max(maxVal - minVal, 1);
      const y = height - paddingY - norm * (height - paddingY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const last = data[data.length - 1];
  const first = data[0];
  const delta = last.total - first.total;

  return (
    <div className="h-52 rounded-xl border p-3" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36" preserveAspectRatio="none" role="img" aria-label="نمو المستخدمين">
        <polyline
          fill="none"
          stroke="var(--gold)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span style={{ color: "var(--text-muted)" }}>النمو الكلي</span>
        <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          {delta >= 0 ? `+${delta}` : delta}
        </span>
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        آخر قيمة: {last.total}
      </div>
    </div>
  );
}

export default function Admin() {
  const { token, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const growthData = users
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .reduce((acc, u) => {
      const key = new Date(u.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
      const prev = acc[acc.length - 1]?.total || 0;
      acc.push({ date: key, total: prev + 1 });
      return acc;
    }, []);

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    Promise.all([
      fetch("/api/admin/stats", { headers: h }).then((r) => { if (!r.ok) throw new Error(r.status === 403 ? "403" : "error"); return r.json(); }),
      fetch("/api/admin/users", { headers: h }).then((r) => { if (!r.ok) throw new Error(r.status === 403 ? "403" : "error"); return r.json(); }),
    ])
      .then(([s, u]) => { setStats(s); setUsers(Array.isArray(u) ? u : []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleUser = async (id) => {
    const res = await fetch(`/api/admin/users/${id}/toggle`, { method: "PUT", headers });
    const data = await res.json();
    if (data.is_active !== undefined) setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: data.is_active } : u)));
  };

  const changeRole = async (id, role) => {
    await fetch(`/api/admin/users/${id}/role`, { method: "PUT", headers, body: JSON.stringify({ role }) });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(212,168,83,0.3)", borderTopColor: "var(--gold)" }} />
      </div>
    );
  }

  if (error) {
    const is403 = error === "403";
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass-luxury rounded-2xl p-8 max-w-sm text-center space-y-4">
          <div className="text-4xl">{is403 ? "🔒" : "⚠️"}</div>
          <h2 className="font-semibold text-lg" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            {is403 ? "صلاحيات غير كافية" : "خطأ في تحميل البيانات"}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {is403 ? "جلستك الحالية لا تحتوي على صلاحية المسؤول." : "حدث خطأ أثناء تحميل بيانات لوحة التحكم."}
          </p>
          {is403 && (
            <button onClick={logout} className="btn-luxury w-full rounded-xl py-2.5 text-sm font-medium">
              تسجيل الخروج وإعادة الدخول
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scroll">
      <PageHeader title="لوحة التحكم" description="إدارة المستخدمين والإحصائيات العامة" icon="⬢" />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="بحث بالاسم أو البريد..." />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl px-3 py-2 text-sm input-luxury">
            <option value="all">كل الصلاحيات</option><option value="admin">Admins</option><option value="user">Users</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl px-3 py-2 text-sm input-luxury">
            <option value="all">كل الحالات</option><option value="active">نشط</option><option value="inactive">معطل</option>
          </select>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "المستخدمون", value: stats.totalUsers, icon: "👥" },
              { label: "النشطون", value: stats.activeUsers, icon: "✅" },
              { label: "المحادثات", value: stats.totalConversations, icon: "💬" },
              { label: "الرسائل", value: stats.totalMessages, icon: "📝" },
              { label: "المستندات", value: stats.totalDocuments, icon: "📄" },
              { label: "رسائل اليوم", value: stats.todayMessages, icon: "📊" },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4!">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="glass-card p-5!">
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>نمو المستخدمين</h2>
          <GrowthSparkline data={growthData} />
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>إدارة المستخدمين</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
                  <th className="px-4 py-3 font-medium">المستخدم</th>
                  <th className="px-4 py-3 font-medium">البريد</th>
                  <th className="px-4 py-3 font-medium">الصلاحية</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">المحادثات</th>
                  <th className="px-4 py-3 font-medium">الرسائل</th>
                  <th className="px-4 py-3 font-medium">الملفات</th>
                  <th className="px-4 py-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.filter((u) => {
                  const q = `${u.name || ""} ${u.email || ""}`.toLowerCase();
                  return q.includes(search.toLowerCase()) && (roleFilter === "all" || u.role === roleFilter) &&
                    (statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active));
                }).map((u) => (
                  <tr key={u.id} className="border-b transition-colors duration-200"
                    style={{ borderColor: "var(--border-subtle)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(212,168,83,0.02)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: "var(--gradient-primary)", color: "#0a0a0a" }}>
                          {u.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span style={{ color: "var(--text-primary)" }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: u.role === "admin" ? "rgba(212,168,83,0.1)" : "var(--bg-surface)", color: u.role === "admin" ? "var(--gold)" : "var(--text-muted)" }}>
                        {u.role === "admin" ? "مسؤول" : "مستخدم"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: u.is_active ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: u.is_active ? "var(--accent-success)" : "var(--accent-danger)" }}>
                        {u.is_active ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.conversations_count}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.messages_count}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.documents_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setConfirmAction({
                          type: "toggle", user: u, title: u.is_active ? "تعطيل المستخدم" : "تفعيل المستخدم",
                          body: `هل أنت متأكد من ${u.is_active ? "تعطيل" : "تفعيل"} حساب ${u.name}؟`, confirm: () => toggleUser(u.id),
                        })}
                          className="text-xs px-2 py-1 rounded-lg border transition-colors duration-200"
                          style={{ borderColor: u.is_active ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)", color: u.is_active ? "var(--accent-danger)" : "var(--accent-success)" }}>
                          {u.is_active ? "تعطيل" : "تفعيل"}
                        </button>
                        <button onClick={() => setConfirmAction({
                          type: "role", user: u, title: "تغيير الصلاحية",
                          body: `هل تريد ${u.role === "admin" ? "تخفيض" : "ترقية"} ${u.name}؟`, confirm: () => changeRole(u.id, u.role === "admin" ? "user" : "admin"),
                        })}
                          className="text-xs px-2 py-1 rounded-lg border transition-colors duration-200"
                          style={{ borderColor: "rgba(212,168,83,0.2)", color: "var(--gold)" }}>
                          {u.role === "admin" ? "تخفيض" : "ترقية"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-luxury rounded-2xl p-5 max-w-sm w-full animate-scale-in">
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{confirmAction.title}</h3>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>{confirmAction.body}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmAction(null)}
                className="px-3 py-2 rounded-xl text-sm border transition-colors duration-200"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                إلغاء
              </button>
              <button onClick={async () => { await confirmAction.confirm(); setConfirmAction(null); }}
                className="btn-luxury px-4 py-2 rounded-xl text-sm font-medium">
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
