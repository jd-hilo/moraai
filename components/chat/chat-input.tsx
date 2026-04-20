"use client";

import React, { useState, useRef, useCallback } from "react";

interface ModelInfo {
  id: string;
  label: string;
  provider: "anthropic" | "openai";
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  selectedModelId?: string;
  availableModels?: ModelInfo[];
  onModelChange?: (id: string) => void;
}

export function ChatInput({
  onSend,
  disabled,
  selectedModelId = "",
  availableModels = [],
  onModelChange,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
  };

  const hasText = value.trim().length > 0;

  const selectedModel = availableModels.find((m) => m.id === selectedModelId);
  const modelLabel = selectedModel?.label ?? "Select model";

  // Close dropdown when clicking outside
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setModelDropdownOpen(false);
    }
  };

  return (
    <div
      style={{
        padding: "12px 16px 20px",
        backgroundColor: "#ffffff",
        flexShrink: 0,
      }}
    >
      {/* Input container */}
      <div
        style={{
          position: "relative",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e5e5e5",
          boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          maxWidth: "768px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Message Mora..."
          rows={1}
          style={{
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: "15px",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.6,
            color: "#0d0d0d",
            backgroundColor: "transparent",
            padding: "14px 16px 8px",
            maxHeight: "160px",
            width: "100%",
          }}
        />

        {/* Bottom bar: model picker left, send button right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px 10px",
          }}
        >
          {/* Model picker — inline dropdown */}
          {availableModels.length > 0 && onModelChange ? (
            <div
              ref={dropdownRef}
              style={{ position: "relative" }}
              onBlur={handleBlur}
            >
              <button
                type="button"
                onClick={() => setModelDropdownOpen((v) => !v)}
                disabled={disabled}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e5e5",
                  backgroundColor: "#f4f4f4",
                  color: "#6e6e80",
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: disabled ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  lineHeight: 1.4,
                }}
              >
                {modelLabel}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: modelDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s",
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {modelDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: 0,
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 10,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    zIndex: 100,
                    minWidth: 200,
                    overflow: "hidden",
                  }}
                >
                  {(["anthropic", "openai"] as const).map((provider) => {
                    const group = availableModels.filter((m) => m.provider === provider);
                    if (group.length === 0) return null;
                    return (
                      <div key={provider}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#6e6e80",
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            padding: "8px 12px 4px",
                          }}
                        >
                          {provider === "anthropic" ? "Anthropic" : "OpenAI"}
                        </div>
                        {group.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onModelChange(m.id);
                              setModelDropdownOpen(false);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 12px",
                              fontSize: 13,
                              fontFamily: "'DM Sans', sans-serif",
                              color: m.id === selectedModelId ? "#0d0d0d" : "#6e6e80",
                              fontWeight: m.id === selectedModelId ? 500 : 400,
                              backgroundColor:
                                m.id === selectedModelId ? "rgba(0,0,0,0.05)" : "transparent",
                              border: "none",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (m.id !== selectedModelId)
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                  "rgba(0,0,0,0.04)";
                            }}
                            onMouseLeave={(e) => {
                              if (m.id !== selectedModelId)
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                  "transparent";
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Send button — dark circle with up-arrow */}
          <button
            onClick={handleSend}
            disabled={disabled || !hasText}
            aria-label="Send message"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              backgroundColor: hasText && !disabled ? "#0d0d0d" : "#e5e5e5",
              color: hasText && !disabled ? "#ffffff" : "#b0b0b0",
              cursor: hasText && !disabled ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            {/* Up arrow */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          textAlign: "center",
          fontSize: "11px",
          color: "#6e6e80",
          marginTop: "8px",
        }}
      >
        Mora can make mistakes. Check important info.
      </div>
    </div>
  );
}
