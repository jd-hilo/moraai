"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="mora-app-shell" style={{ display: "flex", minHeight: "100dvh" }}>
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        className="mora-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          position: "relative",
        }}
      >
        {/* Mobile hamburger — hidden on desktop via media query class */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            zIndex: 40,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            cursor: "pointer",
          }}
          className="md-hidden-toggle mora-mobile-menu"
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path
              d="M1 1H15M1 6H15M1 11H15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {children}
      </main>
    </div>
  );
}
