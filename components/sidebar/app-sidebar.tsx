"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  preview: string;
}

interface CreditsInfo {
  credits: number;
  weeklyCredits: number;
  resetsAt: string;
}

/** Tiny badge at the bottom of the sidebar showing weekly credit balance. */
function CreditBadge() {
  const pathname = usePathname();
  const [info, setInfo] = useState<CreditsInfo | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setInfo(data))
      .catch(() => setInfo(null));
  }, [pathname]);

  if (!info) return null;
  const pct = Math.max(0, Math.min(100, (info.credits / info.weeklyCredits) * 100));
  const low = pct < 20;

  // Format reset date as "resets Sun" or "in 2d"
  const resetsAt = new Date(info.resetsAt);
  const daysAway = Math.max(
    0,
    Math.ceil((resetsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );
  const resetLabel = daysAway <= 0 ? "resets soon" : daysAway === 1 ? "resets in 1 day" : `resets in ${daysAway} days`;

  return (
    <div
      style={{
        padding: "10px 12px 14px",
        borderTop: "1px solid #ececec",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#0d0d0d", letterSpacing: "0.02em" }}>
          {info.credits} credits
        </span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>{resetLabel}</span>
      </div>
      <div
        style={{
          height: 3,
          borderRadius: 3,
          backgroundColor: "#ececec",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: low ? "#dc2626" : "#0d0d0d",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icons as inline SVGs — no external deps
function IconNewChat() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconSimulations() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  );
}

function IconMemory() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function groupByDate(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conv of conversations) {
    const d = new Date(conv.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) {
      groups[0].items.push(conv);
    } else if (day >= yesterday) {
      groups[1].items.push(conv);
    } else {
      groups[2].items.push(conv);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data) => setConversations(data.conversations || []))
      .catch(() => setConversations([]));
  }, [pathname]);

  const navItems = [
    { href: "/chat", label: "New chat", Icon: IconNewChat },
    { href: "/memory", label: "Memory", Icon: IconMemory },
    { href: "/settings", label: "Settings", Icon: IconSettings },
  ];

  const skillItems = [
    { href: "/skills/simulations", label: "Simulations", Icon: IconSimulations },
  ];

  const isActive = (href: string) => {
    if (href === "/chat" && pathname === "/chat") return true;
    if (href === "/skills/simulations") {
      return pathname?.startsWith("/skills/simulations") ?? false;
    }
    return pathname === href;
  };

  const groups = groupByDate(conversations);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 49,
          }}
          className="sidebar-backdrop"
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          backgroundColor: "#f9f9f9",
          borderRight: "1px solid #e5e5e5",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
        }}
        className="sidebar-panel"
      >
        {/* Header: Mora wordmark + compose button */}
        <div
          style={{
            padding: "16px 12px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <img
            src="/mora-logo.png"
            alt="Mora"
            style={{
              height: 28,
              width: "auto",
              display: "block",
            }}
          />
          <Link
            href="/chat"
            onClick={onClose}
            aria-label="New chat"
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: "#6e6e80",
              textDecoration: "none",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(0,0,0,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
            }}
          >
            <IconCompose />
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "4px 8px 8px", flexShrink: 0 }}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            const hovered = hoveredHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                onMouseEnter={() => setHoveredHref(item.href)}
                onMouseLeave={() => setHoveredHref(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: active ? 500 : 400,
                  color: active ? "#0d0d0d" : "#0d0d0d",
                  textDecoration: "none",
                  backgroundColor: active
                    ? "rgba(0,0,0,0.07)"
                    : hovered
                    ? "rgba(0,0,0,0.05)"
                    : "transparent",
                  transition: "background-color 0.12s",
                  marginBottom: "1px",
                }}
              >
                <span
                  style={{
                    width: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: active ? "#0d0d0d" : "#6e6e80",
                    flexShrink: 0,
                  }}
                >
                  <item.Icon />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Skills section */}
        <div style={{ padding: "8px 8px 4px", flexShrink: 0 }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#6e6e80",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              padding: "0 10px",
              marginBottom: "6px",
            }}
          >
            Skills
          </div>
          {skillItems.map((item) => {
            const active = isActive(item.href);
            const hovered = hoveredHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                onMouseEnter={() => setHoveredHref(item.href)}
                onMouseLeave={() => setHoveredHref(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: active ? 500 : 400,
                  color: "#0d0d0d",
                  textDecoration: "none",
                  backgroundColor: active
                    ? "rgba(0,0,0,0.07)"
                    : hovered
                    ? "rgba(0,0,0,0.05)"
                    : "transparent",
                  transition: "background-color 0.12s",
                  marginBottom: "1px",
                }}
              >
                <span
                  style={{
                    width: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: active ? "#0d0d0d" : "#6e6e80",
                    flexShrink: 0,
                  }}
                >
                  <item.Icon />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: "#e5e5e5", margin: "8px 8px 0", flexShrink: 0 }} />

        {/* Recent conversations */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 8px 12px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#6e6e80",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              padding: "0 10px",
              marginBottom: "6px",
            }}
          >
            Recent
          </div>

          {conversations.length === 0 && (
            <div
              style={{
                fontSize: "13px",
                color: "#6e6e80",
                padding: "6px 10px",
              }}
            >
              No conversations yet
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#6e6e80",
                  padding: "4px 10px 4px",
                  marginBottom: "2px",
                }}
              >
                {group.label}
              </div>
              {group.items.map((conv) => {
                const convActive = pathname === `/chat/${conv.id}`;
                const convHovered = hoveredConvId === conv.id;
                return (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    onClick={onClose}
                    onMouseEnter={() => setHoveredConvId(conv.id)}
                    onMouseLeave={() => setHoveredConvId(null)}
                    style={{
                      display: "block",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      marginBottom: "1px",
                      backgroundColor: convActive
                        ? "rgba(0,0,0,0.07)"
                        : convHovered
                        ? "rgba(0,0,0,0.05)"
                        : "transparent",
                      transition: "background-color 0.12s",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 400,
                        color: "#0d0d0d",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {conv.title || conv.preview || "Untitled"}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <CreditBadge />
      </aside>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-panel {
            transform: translateX(0) !important;
          }
          .sidebar-backdrop {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
