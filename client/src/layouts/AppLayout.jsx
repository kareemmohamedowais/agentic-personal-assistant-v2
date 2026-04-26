import { Outlet, useLocation } from "react-router-dom";
import TopNavbar from "../components/TopNavbar";
import { motion, AnimatePresence } from "framer-motion";
import { usePerformance } from "../contexts/PerformanceContext";

export function AppLayout() {
  const location = useLocation();
  const { isPerformanceMode } = usePerformance();

  return (
    <div className="flex flex-col h-screen font-sans relative isolate overflow-hidden"
       style={{
         background: "var(--bg-primary)",
         color: "var(--text-primary)",
         fontFamily: "var(--font-body)",
       }}
    >
      {/* Premium Background — gradient orbs + noise + dots */}
      <div className="bg-decoration">
        <div className="bg-noise" />
        <div className="bg-dots" />
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <TopNavbar />
      
      <main className="flex-1 min-h-0 relative max-w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={isPerformanceMode ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isPerformanceMode ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={isPerformanceMode ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }}
            className="h-full w-full flex flex-col min-h-0"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default AppLayout;
