// DESIGN DECISION: Warm glass sidebar with gold accent border and refined animations, now resizable!
import { useSidebar } from "../contexts/SidebarContext";
import { useEffect, useRef, useState, useCallback } from "react";

export default function Sidebar({ children }) {
  const { isOpen, closeSidebar, sidebarContent } = useSidebar();
  const sidebarRef = useRef(null);
  
  // Resizing state
  const [width, setWidth] = useState(280); // Default width increased slightly
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarWidth");
    if (saved) setWidth(Number(saved));
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        window.innerWidth < 768 &&
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        !isResizing
      ) {
        closeSidebar();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, closeSidebar, isResizing]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      // In RTL with sidebar on the right: the mouse's distance from the right edge is the new width
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem("sidebarWidth", width);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.classList.add("cursor-col-resize", "select-none");
    } else {
      document.body.classList.remove("cursor-col-resize", "select-none");
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("cursor-col-resize", "select-none");
    };
  }, [isResizing, width]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 transition-opacity duration-300 bg-black/50 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        ref={sidebarRef}
        className={`fixed md:sticky top-14 left-0 h-[calc(100vh-3.5rem)] z-40 shrink-0 overflow-hidden flex flex-col ${
          isOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full md:translate-x-0"
        }`}
        style={{
          width: isOpen ? (window.innerWidth >= 768 ? `${width}px` : "280px") : "0px",
          background: "var(--sidebar-bg)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderRight: "1px solid var(--border-color)",
          transition: isResizing ? "none" : "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Resize handle (Left edge in RTL) */}
        <div 
          className="hidden md:block absolute top-0 left-0 w-1.5 h-full cursor-col-resize z-50 hover:bg-[var(--gold)] transition-colors opacity-0 hover:opacity-100"
          onMouseDown={handleMouseDown}
        />

        {/* Gold accent line at top */}
        <div className="h-[2px] w-full shrink-0 relative z-10" style={{ background: "linear-gradient(to right, var(--gold), transparent)" }} />
        
        <div className="flex-1 overflow-y-auto sidebar-scroll w-full p-3 flex flex-col gap-4 relative z-10">
          {children || sidebarContent || (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "rgba(212,168,83,0.06)", border: "1px solid rgba(212,168,83,0.08)" }}>
                <span className="text-xl" style={{ color: "var(--gold)" }}>◇</span>
              </div>
              <p className="text-sm font-medium" style={{ fontFamily: "var(--font-body)" }}>اختر عنصراً لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
