import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function useConversations(tag = "general") {
  const { token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);

  const fetchConversations = useCallback(async () => {
    try {
      const url = tag ? `/api/conversations?tag=${tag}` : "/api/conversations";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [token, tag]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const startNewConversation = () => {
    setActiveConv(null);
  };

  const deleteConversation = async (id) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeConv?.id === id) {
        startNewConversation();
      }
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePin = async (id) => {
    try {
      await fetch(`/api/conversations/${id}/pin`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const renameConversation = async (id, title) => {
    if (!title?.trim()) return;
    try {
      await fetch(`/api/conversations/${id}/rename`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    conversations,
    activeConv,
    setActiveConv,
    startNewConversation,
    deleteConversation,
    togglePin,
    renameConversation,
    fetchConversations,
  };
}
