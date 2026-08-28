"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chatMessageStream,
  createSession,
  getSessionMessages,
  listSessions,
} from "@/lib/api";
import type { ChatMessage, ChatSessionInfo, Decision } from "@/lib/types";
import { useAuth } from "@/features/auth/auth-provider";

/**
 * Alur asinkron sesi chat (custom hook — development_rules.md).
 * Mengelola daftar sesi, pesan aktif, dan streaming respons Local AI.
 */
export function useChat() {
  const { user } = useAuth();
  const uid = user?.uid ?? "anon";
  const displayName = user?.displayName ?? "Pengguna";

  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [lastDecision, setLastDecision] = useState<Decision | null>(null);
  const [lastRisk, setLastRisk] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  const active = sessions.find((s) => s.sessionId === activeId) ?? null;

  // Hydrate daftar sesi sekali per pengguna.
  useEffect(() => {
    if (!user) return;
    hydrated.current = false;
    let cancelled = false;
    (async () => {
      try {
        const list = await listSessions(uid);
        if (cancelled) return;
        setSessions(list);
        if (list.length > 0) {
          setActiveId(list[0].sessionId);
        } else {
          const { session_id } = await createSession(uid, displayName);
          if (cancelled) return;
          const fresh = await listSessions(uid);
          setSessions(fresh);
          setActiveId(session_id);
        }
        hydrated.current = true;
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, user, displayName]);

  // Muat pesan saat sesi aktif berubah.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setMessagesLoading(true);
    setMessages([]);
    (async () => {
      try {
        const ms = await getSessionMessages(activeId);
        if (cancelled) return;
        setMessages(ms);
        const lastUser = [...ms].reverse().find((m) => m.role === "user");
        setLastDecision(lastUser?.decision ?? null);
        setLastRisk(lastUser?.riskScore ?? null);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const selectSession = useCallback((sessionId: string) => {
    if (streaming) return;
    setActiveId(sessionId);
  }, [streaming]);

  const createNewSession = useCallback(async () => {
    const { session_id } = await createSession(uid, displayName);
    const fresh = await listSessions(uid);
    setSessions(fresh);
    setActiveId(session_id);
  }, [uid, displayName]);

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!activeId || streaming || !text) return;
      setError(null);

      const turnIndex = messages.filter((m) => m.role === "user").length;
      const userMsg: ChatMessage = {
        id: `local_u_${Date.now()}`,
        sessionId: activeId,
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const draftId = `local_a_${Date.now()}`;
      const draft: ChatMessage = {
        id: draftId,
        sessionId: activeId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      setMessages((cur) => [...cur, userMsg, draft]);
      setStreaming(true);

      try {
        await chatMessageStream(
          { session_id: activeId, turn_index: turnIndex, content: text, stream: true },
          (token) => {
            setMessages((cur) =>
              cur.map((m) => (m.id === draftId ? { ...m, content: m.content + token } : m))
            );
          }
        );
        // Sinkronkan state dengan sumber kanonik (termasuk pesan system probe/block).
        const [freshMsgs, freshSessions] = await Promise.all([
          getSessionMessages(activeId),
          listSessions(uid),
        ]);
        setMessages(freshMsgs);
        setSessions(freshSessions);
        const lastUser = [...freshMsgs].reverse().find((m) => m.role === "user");
        setLastDecision(lastUser?.decision ?? null);
        setLastRisk(lastUser?.riskScore ?? null);
      } catch (e) {
        setMessages((cur) => cur.filter((m) => m.id !== draftId || m.content.length > 0));
        setError(e instanceof Error ? e.message : "Gagal mengirim pesan ke gateway.");
      } finally {
        setStreaming(false);
      }
    },
    [activeId, streaming, messages, uid]
  );

  return {
    sessions,
    sessionsLoading,
    active,
    activeId,
    messages,
    messagesLoading,
    streaming,
    lastDecision,
    lastRisk,
    error,
    selectSession,
    createNewSession,
    send,
    clearError: () => setError(null),
  };
}
