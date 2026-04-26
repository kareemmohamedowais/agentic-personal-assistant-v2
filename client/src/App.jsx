import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { DevDocsProvider } from "./contexts/DevDocsContext";
import { GitHubReposProvider } from "./contexts/GitHubReposContext";
import { PerformanceProvider } from "./contexts/PerformanceContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const GeneralChat = lazy(() => import("./pages/GeneralChat"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DocumentRAG = lazy(() => import("./pages/DocumentRAG"));
const GitHubRAG = lazy(() => import("./pages/GitHubRAG"));
const DevDocsRAG = lazy(() => import("./pages/DevDocsRAG"));
const UnifiedSearch = lazy(() => import("./pages/UnifiedSearch"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));

function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <DevDocsProvider>
    <GitHubReposProvider>
    <PerformanceProvider>
    <SidebarProvider>
      <BrowserRouter>
        <Suspense fallback={<AppLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected — with sidebar layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<GeneralChat />} />
              <Route path="/document-rag" element={<DocumentRAG />} />
              <Route path="/github-rag" element={<GitHubRAG />} />
              <Route path="/dev-docs" element={<DevDocsRAG />} />
              <Route path="/search" element={<UnifiedSearch />} />

              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SidebarProvider>
    </PerformanceProvider>
    </GitHubReposProvider>
    </DevDocsProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
