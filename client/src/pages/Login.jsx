// DESIGN DECISION: Animated gradient mesh background, floating glass card with gold border,
// gold focus ring inputs, gold gradient submit button with hover glow
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول");

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
      {/* Animated gradient background */}
      <div className="absolute inset-0 animate-mesh-gradient opacity-60 mesh-gradient-bg" />

      {/* Noise texture */}
      <div className="bg-noise absolute inset-0" />

      {/* Floating gradient orbs */}
      <div className="absolute top-[15%] left-[15%] w-96 h-96 rounded-full animate-float-slow opacity-40"
        style={{ background: "radial-gradient(circle, rgba(212,168,83,0.12) 0%, transparent 70%)" }} />
      <div className="absolute bottom-[10%] right-[10%] w-80 h-80 rounded-full animate-float-slow opacity-30"
        style={{ background: "radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)", animationDelay: "-10s" }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-reveal-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-2xl animate-pulse-glow"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 8px 32px rgba(212,168,83,0.2)" }}>
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" style={{ color: "#0a0a0a" }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: "var(--font-display)" }}>
            مرحباً بعودتك
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            سجّل دخولك للوصول إلى المساعد الذكي
          </p>
        </div>

        {/* Login Card */}
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
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>البريد الإلكتروني</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm input-luxury"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>كلمة المرور</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm input-luxury"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-luxury w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  جارٍ تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>

{/* 
          <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
            ليس لديك حساب؟{" "}
            <Link to="/register" className="font-medium transition-colors duration-200"
              style={{ color: "var(--gold)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--gold-light)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--gold)"}
            >
              إنشاء حساب
            </Link>
          </p>
          */}
        </div>
      </div>
    </div>
  );
}
