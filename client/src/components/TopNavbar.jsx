import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  MessageSquare, 
  FileText, 
  GitBranch, 
  BookOpen, 
  LineChart, 
  Search, 
  Settings, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck,
  ChevronLeft,
  Menu,
  Zap
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "الرئيسية", Icon: Home },
  { to: "/chat", label: "المحادثة", Icon: MessageSquare },
  { to: "/document-rag", label: "Document RAG", Icon: FileText },
  { to: "/github-rag", label: "GitHub RAG", Icon: GitBranch },
  { to: "/dev-docs", label: "Dev Docs RAG", Icon: BookOpen },
  { to: "/search", label: "بحث", Icon: Search },
];

const moreItems = [
  { to: "/analytics", label: "الإحصائيات", Icon: LineChart },
  { to: "/settings", label: "الإعدادات", Icon: Settings },
];

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOpen, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate("/login");
  };

  return (
    <header
      className="sticky top-0 z-50 h-14 shrink-0 transition-luxury"
      style={{
        background: "var(--navbar-bg)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div className="flex items-center h-full px-4 gap-3">
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold)"; e.currentTarget.style.background = "rgba(212,168,83,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }}
          title={isOpen ? "إخفاء القائمة" : "إظهار القائمة"}
        >
          {isOpen ? (
            <ChevronLeft className="w-5 h-5 transition-transform duration-300" />
          ) : (
            <Menu className="w-5 h-5 transition-transform duration-300" />
          )}
        </button>

        {/* Logo */}
        <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <motion.div 
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/20"
            style={{ background: "var(--gradient-primary)" }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap className="w-4.5 h-4.5" style={{ color: "#0a0a0a" }} fill="currentColor" />
          </motion.div>
          <span className="font-bold text-sm gradient-text hidden sm:inline group-hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}
          >
            المساعد الذكي
          </span>
        </NavLink>

        {/* Separator — gold gradient line */}
        <div className="w-px h-5 mx-1 hidden md:block" style={{ background: "linear-gradient(to bottom, transparent, rgba(212,168,83,0.2), transparent)" }} />

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto custom-scroll">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? "text-(--gold) bg-[rgba(212,168,83,0.08)] border border-[rgba(212,168,83,0.18)]"
                    : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-white/5"
                }`
              }
              style={{ fontFamily: "var(--font-body)" }}
            >
              {({ isActive }) => (
                <>
                  <item.Icon className={`w-3.5 h-3.5 opacity-60 transition-transform ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  <span>{item.label}</span>
                  {/* Gold underline indicator with Framer Motion layoutId */}
                  {isActive && (
                    <motion.span 
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{ background: "var(--gradient-primary)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1.5 shrink-0 mr-auto md:mr-0">
          {/* More items */}
          {moreItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="hidden lg:flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all duration-300 hover:text-(--text-primary) hover:bg-white/5"
              style={({ isActive }) => ({
                color: isActive ? "var(--gold)" : "var(--text-muted)",
              })}
            >
              <item.Icon className="w-3.5 h-3.5 opacity-50" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Admin */}
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              className="hidden lg:flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all duration-300"
              style={({ isActive }) => ({
                color: isActive ? "var(--accent-warning)" : "rgba(251,191,36,0.5)",
                background: isActive ? "rgba(251,191,36,0.08)" : "transparent",
              })}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>أدمن</span>
            </NavLink>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
            title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            <motion.div
              animate={{ rotate: theme === "dark" ? 0 : 180, scale: [1, 1.2, 1] }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </motion.div>
          </button>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl transition-all duration-300 btn-premium"
              style={{ background: showUserMenu ? "rgba(212,168,83,0.06)" : "transparent" }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm shadow-indigo-500/10"
                style={{ background: "var(--gradient-primary)", color: "#0a0a0a", fontFamily: "var(--font-display)" }}
              >
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-xs hidden sm:inline max-w-20 truncate font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                {user?.name}
              </span>
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute left-0 top-full mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50 glass-luxury"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{user?.name}</p>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
                  </div>

                  {/* Profile Link (placeholder for future) */}
                  <div className="py-1 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                     <NavLink
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-200 hover:bg-white/5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <Settings className="w-4 h-4 opacity-50" />
                        <span>الإعدادات</span>
                      </NavLink>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-200 hover:bg-red-500/10"
                      style={{ color: "var(--accent-danger)" }}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
