// DESIGN DECISION: Same mesh gradient bg as Login, gold password strength meter, refined step indicators
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const passwordScore =
    (form.password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(form.password) ? 1 : 0) +
    (/[0-9]/.test(form.password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(form.password) ? 1 : 0);
  const passwordPercent = Math.min(100, passwordScore * 25);
  const passwordLabel =
    passwordScore <= 1 ? "ضعيفة" : passwordScore <= 2 ? "متوسطة" : passwordScore === 3 ? "جيدة" : "قوية";
  const strengthColor =
    passwordScore <= 1 ? "var(--accent-danger)" : passwordScore <= 2 ? "var(--accent-warning)" : passwordScore === 3 ? "var(--accent-success)" : "var(--teal)";

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحساب");

      login(data.token, data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden mesh-gradient-bg">
      <div className="absolute inset-0 animate-mesh-gradient opacity-60 mesh-gradient-bg" />
      <div className="bg-noise absolute inset-0" />
      
      {/* Floating orbs */}
      <div className="absolute top-[20%] right-[15%] w-96 h-96 rounded-full animate-float-slow opacity-35"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)" }} />
      <div className="absolute bottom-[15%] left-[10%] w-80 h-80 rounded-full animate-float-slow opacity-30"
        style={{ background: "radial-gradient(circle, rgba(212,168,83,0.1) 0%, transparent 70%)", animationDelay: "-8s" }} />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-reveal-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-2xl animate-pulse-glow"
               style={{ background: "var(--gradient-primary)", boxShadow: "0 8px 32px rgba(212,168,83,0.2)" }}>
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" style={{ color: "#0a0a0a" }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: "var(--font-display)" }}>
            إنشاء حساب جديد
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            ابدأ مجاناً الآن
          </p>
          {/* Step indicator */}
          <div className="mt-4 flex items-center justify-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--gradient-primary)", color: "#0a0a0a" }}>1</span>
              <span style={{ color: "var(--gold)" }}>معلومات الحساب</span>
            </div>
            <div className="w-6 h-[1px]" style={{ background: "var(--border-color)" }} />
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>2</span>
              <span style={{ color: "var(--text-muted)" }}>التفعيل</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="glass-luxury gradient-border rounded-2xl p-8 shadow-2xl animate-scale-in" style={{ animationDelay: "100ms" }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm animate-shake"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", color: "var(--accent-danger)" }}>
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>الاسم</label>
              <input name="name" type="text" required value={form.name} onChange={handleChange} placeholder="اسمك الكامل"
                className="w-full rounded-xl px-4 py-3 text-sm input-luxury" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>البريد الإلكتروني</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="email@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm input-luxury" dir="ltr" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>كلمة المرور</label>
              <input name="password" type="password" required minLength={6} value={form.password} onChange={handleChange} placeholder="6 أحرف على الأقل"
                className="w-full rounded-xl px-4 py-3 text-sm input-luxury" />
              <div className="mt-2.5">
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${passwordPercent}%`, background: strengthColor }} />
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  قوة كلمة المرور: <span style={{ color: strengthColor }}>{passwordLabel}</span>
                </p>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-luxury w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  جارٍ إنشاء الحساب...
                </>
              ) : (
                "إنشاء الحساب"
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="font-medium transition-colors duration-200"
              style={{ color: "var(--gold)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--gold-light)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--gold)"}
            >
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
