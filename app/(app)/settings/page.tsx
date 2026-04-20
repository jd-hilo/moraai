"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [exportingObsidian, setExportingObsidian] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleExport = async (format: "obsidian" | "json") => {
    const setLoading = format === "obsidian" ? setExportingObsidian : setExportingJson;
    setLoading(true);
    try {
      const response = await fetch(`/api/vault/export?format=${format}`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "obsidian" ? "mora-vault.zip" : "mora-vault.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut(() => router.push("/"));
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "delete") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      // Clear the Clerk session before navigating — otherwise the cookie
      // lingers and Clerk still thinks the user is signed in.
      await signOut();
      router.push("/");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        style={{
          flex: 1,
          padding: "24px",
          maxWidth: "600px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#1a1a1a",
            letterSpacing: "-0.02em",
            marginBottom: "40px",
            paddingTop: "16px",
          }}
        >
          Settings
        </h1>

        {/* Account */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <Row label="Name" value={user?.fullName || "Not set"} />
            <Row label="Email" value={user?.primaryEmailAddress?.emailAddress || "Not set"} />
          </Card>
        </section>

        {/* Export */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel>Export your vault</SectionLabel>
          <Card>
            <p style={{ fontSize: "14px", color: "#888", marginBottom: "16px" }}>
              Download your memory vault. The Obsidian format creates a .zip of markdown files
              you can open directly in Obsidian.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => handleExport("obsidian")} disabled={exportingObsidian}>
                {exportingObsidian ? "Exporting…" : "Export to Obsidian"}
              </Button>
              <Button variant="secondary" onClick={() => handleExport("json")} disabled={exportingJson}>
                {exportingJson ? "Exporting…" : "Export as JSON"}
              </Button>
            </div>
          </Card>
        </section>

        {/* Session */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel>Session</SectionLabel>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "15px", color: "#1a1a1a", fontWeight: 500 }}>Sign out</div>
                <div style={{ fontSize: "13px", color: "#888", marginTop: 2 }}>
                  You can sign back in anytime.
                </div>
              </div>
              <button onClick={handleSignOut} style={outlineBtn}>
                Sign out
              </button>
            </div>
          </Card>
        </section>

        {/* Danger zone */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel danger>Danger zone</SectionLabel>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "1px solid rgba(220,38,38,0.2)",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "15px", color: "#1a1a1a", fontWeight: 500 }}>
                  Delete account
                </div>
                <div style={{ fontSize: "13px", color: "#888", marginTop: 2 }}>
                  Permanently delete your account and all memory data.
                </div>
              </div>
              <button
                onClick={() => { setShowDeleteConfirm(true); setDeleteInput(""); setDeleteError(""); }}
                style={dangerBtn}
              >
                Delete account
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          onClick={() => { if (!deleting) setShowDeleteConfirm(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(10,8,20,0.45)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 420,
              padding: "28px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", margin: "0 0 8px" }}>
              Delete your account?
            </h2>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.55, marginBottom: 20 }}>
              This will permanently delete your account, all conversations, and your entire
              memory vault. <strong>This cannot be undone.</strong>
            </p>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
              Type <strong>delete</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="delete"
              disabled={deleting}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.12)",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />
            {deleteError && (
              <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 12 }}>{deleteError}</p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "delete" || deleting}
                style={{
                  ...dangerBtn,
                  flex: 1, height: 42, opacity: deleteInput !== "delete" ? 0.4 : 1,
                  cursor: deleteInput !== "delete" ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{ ...outlineBtn, flex: 1, height: 42 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── small components ─────────────────────────────────────────────── */

function SectionLabel({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <h2
      style={{
        fontSize: "14px",
        fontWeight: 500,
        color: danger ? "#dc2626" : "#888",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "12px",
      }}
    >
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "12px",
        border: "1px solid rgba(0,0,0,0.08)",
        padding: "20px",
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "15px", color: "#1a1a1a" }}>{value}</div>
    </div>
  );
}

const outlineBtn: React.CSSProperties = {
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "#fff",
  fontSize: 13,
  fontWeight: 500,
  color: "#1a1a1a",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  whiteSpace: "nowrap",
};

const dangerBtn: React.CSSProperties = {
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  whiteSpace: "nowrap",
};
