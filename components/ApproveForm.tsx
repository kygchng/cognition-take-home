"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveForm({ issueNumber }: { issueNumber: number }) {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve");
      router.refresh();
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  }

  return (
    <div className="approve-panel">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Optional: leave a note for Devin before it executes…"
        disabled={loading}
        rows={3}
        className="approve-textarea"
      />
      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--pill-failed-text)" }}>
          {error}
        </p>
      )}
      <div className="flex justify-end mt-3">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="approve-btn"
        >
          {loading ? "Starting…" : "Approve & Execute →"}
        </button>
      </div>

      <style jsx>{`
        .approve-panel {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          background: var(--bg-secondary);
        }
        .approve-textarea {
          width: 100%;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          font-size: 14px;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px 12px;
          resize: none;
          outline: none;
          transition: border-color 100ms;
        }
        .approve-textarea:focus {
          border-color: var(--border-strong);
        }
        .approve-textarea::placeholder {
          color: var(--text-tertiary);
        }
        .approve-textarea:disabled {
          opacity: 0.5;
        }
        .approve-btn {
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          background: var(--text);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          transition: opacity 100ms;
        }
        .approve-btn:hover:not(:disabled) {
          opacity: 0.85;
        }
        .approve-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
