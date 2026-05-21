"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionPanel({ issueNumber }: { issueNumber: number }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueNumber}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: message.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "#f6f4f0",
        border: "1px solid #d9d5ce",
        borderRadius: 10,
        padding: "18px 20px 16px",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 12,
        }}
      >
        Review &amp; Approve
      </p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add final context or constraints for Devin… (optional)"
        disabled={loading}
        rows={3}
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--text)",
          background: "var(--bg)",
          border: "1px solid #d9d5ce",
          borderRadius: 7,
          padding: "10px 12px",
          resize: "vertical",
          outline: "none",
          opacity: loading ? 0.5 : 1,
          transition: "border-color 100ms",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-strong)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#d9d5ce";
        }}
      />

      {error && (
        <p
          style={{
            fontSize: 12,
            color: "var(--pill-failed-text)",
            marginTop: 8,
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button
          onClick={handleApprove}
          disabled={loading}
          style={{
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            background: "var(--text)",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.45 : 1,
            transition: "opacity 100ms",
            letterSpacing: "-0.01em",
          }}
        >
          {loading ? "Starting…" : "Approve & Execute →"}
        </button>
      </div>
    </div>
  );
}
