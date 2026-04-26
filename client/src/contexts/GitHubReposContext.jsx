import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const GitHubReposContext = createContext(null);

export function GitHubReposProvider({ children }) {
  const { token } = useAuth();
  const [githubReposEnabled, setGithubReposEnabled] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [showGithubReposPanel, setShowGithubReposPanel] = useState(false);

  // Load saved repos from user prefs
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await fetch("/api/github-repos/my-prefs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const repos = data.enabledRepos || [];
          setGithubRepos(repos);
          setGithubReposEnabled(repos.length > 0);
        }
      } catch { /* ignore */ }
    };
    load();
  }, [token]);

  const toggleRepo = useCallback((repoId) => {
    setGithubRepos((prev) =>
      prev.includes(repoId) ? prev.filter((r) => r !== repoId) : [...prev, repoId]
    );
  }, []);

  const toggleGithubRepos = useCallback(() => setGithubReposEnabled((v) => !v), []);

  const savePrefs = useCallback(async () => {
    try {
      await fetch("/api/github-repos/my-prefs", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabledRepos: githubRepos }),
      });
      if (githubRepos.length === 0) setGithubReposEnabled(false);
    } catch (err) {
      console.error("Failed to save github repos prefs:", err);
    }
  }, [token, githubRepos]);

  return (
    <GitHubReposContext.Provider
      value={{
        githubReposEnabled,
        githubRepos,
        showGithubReposPanel,
        setShowGithubReposPanel,
        toggleRepo,
        toggleGithubRepos,
        savePrefs,
      }}
    >
      {children}
    </GitHubReposContext.Provider>
  );
}

export function useGithubRepos() {
  const ctx = useContext(GitHubReposContext);
  if (!ctx) throw new Error("useGithubRepos must be used inside GitHubReposProvider");
  return ctx;
}
