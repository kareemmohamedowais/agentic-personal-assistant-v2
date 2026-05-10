import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function useModels() {
  const { token } = useAuth();
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash-lite");
  const [selectedProvider, setSelectedProvider] = useState("gemini");

  useEffect(() => {
    if (!token) return;
    fetch("/api/models", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setModels(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch models", err));
  }, [token]);

  return {
    models,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider
  };
}
