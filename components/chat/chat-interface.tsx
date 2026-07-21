"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import type { MemoryUpdate } from "@/lib/vault/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  memoryUpdate?: MemoryUpdate;
}

interface ChatInterfaceProps {
  conversationId?: string;
  initialMode?: string;
}

interface ModelInfo {
  id: string;
  label: string;
  provider: "anthropic" | "openai";
}

const MODEL_STORAGE_KEY = "mora.selectedModel";

function getGreeting(firstName?: string | null): string {
  const hour = new Date().getHours();
  const base = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${base}, ${firstName}.` : `${base}.`;
}

export function ChatInterface({ conversationId, initialMode }: ChatInterfaceProps) {
  const searchParams = useSearchParams();
  const mode = initialMode || searchParams.get("mode") || "chat";

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(
    conversationId
  );
  const [, setPendingMemoryUpdate] = useState<MemoryUpdate | null | undefined>(undefined);
  const [isMemoryLoading, setIsMemoryLoading] = useState(false);
  const [memoryLoadingIndex, setMemoryLoadingIndex] = useState<number>(-1);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollAbortRef = useRef<{ cancelled: boolean } | null>(null);

  // Load available models once on mount
  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          const stored =
            typeof window !== "undefined"
              ? window.localStorage.getItem(MODEL_STORAGE_KEY)
              : null;
          const storedValid =
            stored && data.models.some((m: ModelInfo) => m.id === stored);
          setSelectedModelId(storedValid ? stored! : data.defaultModelId);
        }
      })
      .catch(() => {});
  }, []);

  // Load existing conversation
  useEffect(() => {
    if (!conversationId) return;

    fetch(`/api/conversations?id=${conversationId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.messages) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Cancel in-flight poll when unmounting
  useEffect(() => {
    return () => {
      if (pollAbortRef.current) pollAbortRef.current.cancelled = true;
    };
  }, []);

  const pollMemoryUpdate = useCallback(
    async (convId: string, expectedAssistantIndex: number) => {
      if (pollAbortRef.current) pollAbortRef.current.cancelled = true;
      const token = { cancelled: false };
      pollAbortRef.current = token;

      setIsMemoryLoading(true);
      setMemoryLoadingIndex(expectedAssistantIndex);

      const started = Date.now();
      const maxMs = 30_000;
      const intervalMs = 1500;

      try {
        while (!token.cancelled && Date.now() - started < maxMs) {
          await new Promise((r) => setTimeout(r, intervalMs));
          if (token.cancelled) return;

          try {
            const res = await fetch(`/api/conversations?id=${convId}`);
            if (!res.ok) continue;
            const data = await res.json();
            const msgs: Message[] = data?.messages ?? [];
            const target = msgs[expectedAssistantIndex];
            if (target?.role === "assistant" && target.memoryUpdate) {
              if (token.cancelled) return;
              setMessages((prev) => {
                const copy = [...prev];
                if (copy[expectedAssistantIndex]) {
                  copy[expectedAssistantIndex] = {
                    ...copy[expectedAssistantIndex],
                    memoryUpdate: target.memoryUpdate,
                  };
                }
                return copy;
              });
              if (target.memoryUpdate.changes.length > 0) {
                setPendingMemoryUpdate(target.memoryUpdate);
              }
              return;
            }
          } catch {
            // keep trying
          }
        }
      } finally {
        if (!token.cancelled) {
          setIsMemoryLoading(false);
          setMemoryLoadingIndex(-1);
        }
      }
    },
    []
  );

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage: Message = { role: "user", content: text };
      setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
      setIsStreaming(true);
      setIsMemoryLoading(false);
      setMemoryLoadingIndex(-1);
      setPendingMemoryUpdate(undefined);
      if (pollAbortRef.current) pollAbortRef.current.cancelled = true;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: currentConversationId,
            message: text,
            mode,
            model: selectedModelId || undefined,
          }),
        });

        if (!response.ok) {
          // 402 = out of credits — render a friendlier message.
          if (response.status === 402) {
            const body = await response.json().catch(() => ({} as { resetsAt?: string }));
            const resetsAt = body?.resetsAt ? new Date(body.resetsAt) : null;
            const label = resetsAt
              ? `Your credits reset ${resetsAt.toLocaleDateString(undefined, { weekday: "long" })}.`
              : "Your credits reset weekly.";
            throw new Error(`You've used up this week's credits. ${label}`);
          }
          const errBody = await response.text().catch(() => "");
          throw new Error(`Chat request failed (${response.status}): ${errBody}`);
        }

        const newConvId = response.headers.get("X-Conversation-Id");
        const activeConvId = newConvId || currentConversationId;
        if (newConvId && !currentConversationId) {
          setCurrentConversationId(newConvId);
          window.history.replaceState(null, "", `/chat/${newConvId}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let assistantContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        }

        if (activeConvId) {
          setMessages((prev) => {
            const assistantIdx = prev.length - 1;
            pollMemoryUpdate(activeConvId, assistantIdx);
            return prev;
          });
        }
      } catch (error) {
        console.error("Chat error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm sorry, something went wrong. Please try again.",
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [currentConversationId, mode, pollMemoryUpdate, selectedModelId]
  );

  const handleModelChange = useCallback((id: string) => {
    setSelectedModelId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODEL_STORAGE_KEY, id);
    }
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: "100%",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          paddingTop: isEmpty ? "0" : "40px",
          paddingBottom: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: isEmpty ? "center" : "flex-start",
        }}
      >
        {/* Empty state */}
        {isEmpty && !isStreaming && (
          <div
            style={{
              textAlign: "left",
              padding: "48px 40px 40px",
              maxWidth: "860px",
              margin: "0 auto",
              width: "100%",
              position: "relative",
            }}
          >
            {/* Lightweight Unreal-inspired peach atmosphere. */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "50%",
                right: 20,
                transform: "translateY(-50%)",
                width: 360,
                height: 260,
                background:
                  "radial-gradient(ellipse 65% 60% at 50% 50%, rgba(228,181,211,0.34) 0%, rgba(228,184,166,0.22) 48%, transparent 76%)",
                filter: "blur(32px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 18,
                color: "var(--color-text-muted)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                position: "relative",
              }}
            >
              <span aria-hidden style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--gradient-peach)" }} />
              Mora
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(36px, 5vw, 58px)",
                fontWeight: 400,
                color: "var(--color-text-primary)",
                marginBottom: 12,
                maxWidth: 620,
                lineHeight: 1.04,
                letterSpacing: "-0.04em",
                position: "relative",
              }}
            >
              {getGreeting()}
            </h2>
            <p style={{ position: "relative", maxWidth: 520, color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.65 }}>
              Ask about a decision, revisit a memory, or explore how one choice could change what comes next.
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            memoryUpdate={msg.memoryUpdate}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
            isMemoryLoading={isMemoryLoading && i === memoryLoadingIndex && msg.role === "assistant" && !msg.memoryUpdate}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        selectedModelId={selectedModelId}
        availableModels={availableModels}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
