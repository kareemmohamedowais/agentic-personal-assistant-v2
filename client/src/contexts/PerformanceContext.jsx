import { createContext, useContext, useEffect, useMemo, useState } from "react";

const PerformanceContext = createContext(null);
const STORAGE_KEY = "ui-performance-mode";

export function PerformanceProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "performance" ? "performance" : "quality";
    } catch {
      return "quality";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage write errors.
    }
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      isPerformanceMode: mode === "performance",
      setMode,
      toggleMode: () => setMode((prev) => (prev === "performance" ? "quality" : "performance")),
    }),
    [mode]
  );

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

export function usePerformance() {
  const ctx = useContext(PerformanceContext);
  if (!ctx) {
    throw new Error("usePerformance must be used within PerformanceProvider");
  }
  return ctx;
}
