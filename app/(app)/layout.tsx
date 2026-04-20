"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          position: "relative",
          backgroundColor: "#ffffff",
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
            borderRadius: 8,
            border: "1px solid #e5e5e5",
            backgroundColor: "#ffffff",
            cursor: "pointer",
          }}
          className="md-hidden-toggle"
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path
              d="M1 1H15M1 6H15M1 11H15"
              stroke="#0d0d0d"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <style>{`
          @media (min-width: 768px) {
            .md-hidden-toggle { display: none !important; }
          }
          @media (min-width: 768px) {
            main { margin-left: 260px; }
          }
        `}</style>

        {children}
      </main>
    </div>
  );
}
