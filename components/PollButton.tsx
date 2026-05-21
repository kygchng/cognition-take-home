"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PollButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/devin/poll", { method: "POST" });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      style={{
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        fontSize: 12,
        fontWeight: 500,
        background: "transparent",
        color: syncing ? "var(--text-tertiary)" : "var(--text-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "5px 11px",
        cursor: syncing ? "not-allowed" : "pointer",
        transition: "all 100ms",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <span style={{ fontSize: 10, opacity: syncing ? 1 : 0.7 }}>
        {syncing ? "⟳" : "↻"}
      </span>
      {syncing ? "Syncing…" : "Sync"}
    </button>
  );
}
