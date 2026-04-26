import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const DevDocsContext = createContext(null);

export function DevDocsProvider({ children }) {
  const { token } = useAuth();
  const [devDocsEnabled, setDevDocsEnabled] = useState(false);
  const [devDocsFrameworks, setDevDocsFrameworks] = useState([]);
  const [showDevDocsPanel, setShowDevDocsPanel] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await fetch("/api/dev-docs/my-prefs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const fws = data.enabledFrameworks || [];
          setDevDocsFrameworks(fws);
          setDevDocsEnabled(fws.length > 0);
        }
      } catch { /* ignore */ }
    };
    load();
  }, [token]);

  const toggleFramework = useCallback((fwId) => {
    setDevDocsFrameworks((prev) =>
      prev.includes(fwId) ? prev.filter((f) => f !== fwId) : [...prev, fwId]
    );
  }, []);

  const toggleDevDocs = useCallback(() => setDevDocsEnabled((v) => !v), []);

  const savePrefs = useCallback(async () => {
    try {
      await fetch("/api/dev-docs/my-prefs", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabledFrameworks: devDocsFrameworks }),
      });
      if (devDocsFrameworks.length === 0) setDevDocsEnabled(false);
    } catch (err) {
      console.error("Failed to save dev docs prefs:", err);
    }
  }, [token, devDocsFrameworks]);

  return (
    <DevDocsContext.Provider
      value={{
        devDocsEnabled,
        devDocsFrameworks,
        showDevDocsPanel,
        setShowDevDocsPanel,
        toggleFramework,
        toggleDevDocs,
        savePrefs,
      }}
    >
      {children}
    </DevDocsContext.Provider>
  );
}

export function useDevDocs() {
  const ctx = useContext(DevDocsContext);
  if (!ctx) throw new Error("useDevDocs must be used inside DevDocsProvider");
  return ctx;
}
