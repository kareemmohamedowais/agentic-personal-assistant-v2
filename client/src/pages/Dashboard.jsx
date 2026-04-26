// DESIGN DECISION: Hero section with Sora display text reveal, gold-accented feature cards
// with 3D tilt, warm glass recent-items, and staggered entrance animations.
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  FileText, 
  GitBranch, 
  BookOpen, 
  Search, 
  MessagesSquare, 
  Layers, 
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import GlassCard from "../components/GlassCard";
import StatCard from "../components/StatCard";
import Skeleton from "../components/Skeleton";

const features = [
  { to: "/chat", title: "المحادثة الذكية", desc: "تحدث مع المساعد الذكي مع دعم الصور والصوت", Icon: MessageSquare, accent: "rgba(212,168,83,0.15)", color: "var(--gold)" },
  { to: "/document-rag", title: "Document RAG", desc: "ابحث وتحدث مع مستنداتك المرفوعة", Icon: FileText, accent: "rgba(45,212,191,0.15)", color: "var(--teal)" },
  { to: "/github-rag", title: "GitHub RAG", desc: "حلل أكواد GitHub بتقنية RAG", Icon: GitBranch, accent: "rgba(167,139,250,0.12)", color: "var(--accent-tertiary)" },
  { to: "/dev-docs", title: "Dev Docs", desc: "ابحث في توثيق الـ Frameworks", Icon: BookOpen, accent: "rgba(52,211,153,0.12)", color: "var(--accent-success)" },
  { to: "/search", title: "البحث الموحد", desc: "ابحث في كل مواردك من مكان واحد", Icon: Search, accent: "rgba(212,168,83,0.12)", color: "var(--gold)" },
];

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentConversations, setRecentConversations] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, convsRes, docsRes] = await Promise.allSettled([
        fetch("/api/analytics", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/documents", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      }
      if (convsRes.status === "fulfilled" && convsRes.value.ok) {
        const data = await convsRes.value.json();
        setRecentConversations((Array.isArray(data) ? data : []).slice(0, 5));
      }
      if (docsRes.status === "fulfilled" && docsRes.value.ok) {
        const data = await docsRes.value.json();
        setRecentDocuments((Array.isArray(data) ? data : []).slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "ليلة سعيدة";
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scroll">
      {/* Hero Section */}
      <div className="relative overflow-hidden px-6 pt-10 pb-8 md:pt-14 md:pb-12">
        <div className="absolute inset-0" style={{ background: "var(--gradient-surface)" }} />
        
        <div className="relative max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-xs tracking-wider font-bold mb-3 uppercase" 
            style={{ color: "var(--gold)", fontFamily: "var(--font-display)", letterSpacing: "0.15em" }}
          >
            <Sparkles className="w-4 h-4" />
            {getTimeGreeting()}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold mb-5 leading-tight" 
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span style={{ color: "var(--text-primary)" }}>أهلاً بك، </span>
            <span className="gradient-text">{user?.name?.split(" ")[0] || "المستخدم"}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg max-w-2xl opacity-60 leading-relaxed" 
            style={{ fontFamily: "var(--font-body)" }}
          >
            عالم من الإمكانيات الرقمية بين يديك. اختر الأداة التي تناسب احتياجاتك الحالية للبدء في تجربة استثنائية.
          </motion.p>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="px-6 pb-12 max-w-6xl mx-auto space-y-10"
      >
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} height="100px" borderRadius="24px" />)
          ) : (
            <>
              <motion.div variants={itemVariants}><StatCard icon={<MessagesSquare className="w-5 h-5" />} label="المحادثات" value={stats?.totalConversations || 0} /></motion.div>
              <motion.div variants={itemVariants}><StatCard icon={<MessageSquare className="w-5 h-5" />} label="الرسائل" value={stats?.totalMessages || 0} /></motion.div>
              <motion.div variants={itemVariants}><StatCard icon={<FileText className="w-5 h-5" />} label="المستندات" value={stats?.totalDocuments || 0} /></motion.div>
              <motion.div variants={itemVariants}><StatCard icon={<Layers className="w-5 h-5" />} label="Chunks" value={stats?.totalChunks || 0} /></motion.div>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <section>
          <motion.h2 
            variants={itemVariants}
            className="text-xl font-extrabold mb-6 flex items-center gap-3" 
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
             <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
               <TrendingUp className="w-4 h-4" style={{ color: "var(--gold)" }} />
             </div>
             استكشف الأدوات
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div key={feature.to} variants={itemVariants}>
                <GlassCard
                  hover
                  className="cursor-pointer group h-full relative"
                  onClick={() => navigate(feature.to)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-20 group-hover:opacity-100 transition-opacity"
                    style={{ background: feature.color }} />
                  
                  <div className="flex flex-col h-full p-1">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300"
                        style={{ background: feature.accent, border: `1px solid ${feature.accent}`, color: feature.color }}>
                        <feature.Icon className="w-6 h-6" />
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"
                           style={{ background: "rgba(255,255,255,0.05)" }}>
                        <ChevronRight className="w-4 h-4 rotate-180" style={{ color: feature.color }} />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{feature.title}</h3>
                    <p className="text-sm leading-relaxed opacity-70 flex-1">{feature.desc}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Conversations */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-bold mb-5 flex items-center gap-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              <Clock className="w-5 h-5 text-[var(--gold)]" />
              المحادثات الأخيرة
            </h2>
            <GlassCard className="divide-y p-0 overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
              {loading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="p-4"><Skeleton height="40px" borderRadius="12px" /></div>)
              ) : recentConversations.length === 0 ? (
                <div className="text-center py-12">
                   <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <MessagesSquare className="w-6 h-6 opacity-20" />
                   </div>
                   <p className="text-sm opacity-40">لا توجد محادثات حديثة</p>
                </div>
              ) : (
                recentConversations.map((c) => (
                  <div key={c.id}
                    className="flex items-center gap-4 py-4 px-5 cursor-pointer transition-all duration-300 hover:bg-white/5 group"
                    onClick={() => navigate("/chat")}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: "rgba(212,168,83,0.06)", border: "1px solid rgba(212,168,83,0.1)" }}>
                      <MessageSquare className="w-4 h-4 text-[var(--gold)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate group-hover:text-[var(--gold)] transition-colors" style={{ color: "var(--text-primary)" }}>
                        {c.title || "محادثة بدون عنوان"}
                      </p>
                      <p className="text-xs mt-1 opacity-60 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {c.message_count || 0} رسالة في الجلسة
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 rotate-180 transition-all translate-x-2 group-hover:translate-x-0" />
                  </div>
                ))
              )}
            </GlassCard>
          </motion.div>

          {/* Recent Documents */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-bold mb-5 flex items-center gap-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              <FileText className="w-5 h-5 text-[var(--teal)]" />
              آخر المستندات
            </h2>
            <GlassCard className="divide-y p-0 overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
              {loading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="p-4"><Skeleton height="40px" borderRadius="12px" /></div>)
              ) : recentDocuments.length === 0 ? (
                <div className="text-center py-12">
                   <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <Layers className="w-6 h-6 opacity-20" />
                   </div>
                   <p className="text-sm opacity-40">لا توجد مستندات</p>
                </div>
              ) : (
                recentDocuments.map((doc) => (
                  <div key={doc.id}
                    className="flex items-center gap-4 py-4 px-5 cursor-pointer transition-all duration-300 hover:bg-white/5 group"
                    onClick={() => navigate("/document-rag")}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.1)" }}>
                      <FileText className="w-4 h-4 text-[var(--teal)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate group-hover:text-[var(--teal)] transition-colors" style={{ color: "var(--text-primary)" }}>
                        {doc.original_name}
                      </p>
                      <p className="text-xs mt-1 opacity-60">
                        {doc.chunk_count || 0} chunks · {doc.file_type?.toUpperCase() || "FILE"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 rotate-180 transition-all translate-x-2 group-hover:translate-x-0" />
                  </div>
                ))
              )}
            </GlassCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
