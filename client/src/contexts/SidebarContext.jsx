import { createContext, useContext, useState, useCallback } from "react";

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(() => {
    try { return localStorage.getItem("sidebarOpen") !== "false"; } catch { return true; }
  });
  const [sidebarContent, setSidebarContent] = useState(null);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebarOpen", String(next)); } catch (e) {
        console.warn("Failed to set sidebarOpen:", e);
      }
      return next;
    });
  }, []);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
    try { localStorage.setItem("sidebarOpen", "true"); } catch (e) {
      console.warn("Failed to set sidebarOpen:", e);
    }
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
    try { localStorage.setItem("sidebarOpen", "false"); } catch (e) {
      console.warn("Failed to set sidebarOpen:", e);
    }
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        sidebarContent,
        setSidebarContent,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
