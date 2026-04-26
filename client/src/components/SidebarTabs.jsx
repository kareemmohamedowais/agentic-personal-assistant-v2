import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SidebarTabs({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex p-1.5 mx-2.5 mt-3 bg-black/20 rounded-xl gap-1 shrink-0 border border-white/5 relative">
        {tabs.map((tab, idx) => {
          const isActive = activeTab === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`relative flex-1 min-w-0 text-[12px] py-2 px-2 rounded-lg font-bold transition-colors duration-300 flex items-center justify-center gap-1.5 z-10 ${
                isActive ? "text-(--teal)" : "text-(--text-muted) hover:text-(--text-secondary)" 
              }`}
            >
              {isActive && (
                <motion.span 
                  layoutId="sidebar-tab-pill"
                  className="absolute inset-0 bg-teal-500/15 border border-teal-500/20 rounded-lg shadow-sm shadow-teal-500/5"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {tab.icon && <span className="opacity-70">{tab.icon}</span>}
              <span className="relative z-10 leading-none whitespace-nowrap truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto custom-scroll w-full mt-2">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="px-1 h-full"
          > 
            {tabs[activeTab].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
