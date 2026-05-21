"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageForm({
  issueNumber,
  isWaiting = false,
}: {
  issueNumber: number;
  isWaiting?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || isWaiting) return;
    setLoading(true);
    try {
      await fetch(`/api/issues/${issueNumber}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      setMessage("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || isWaiting;

  return (
    <form onSubmit={handleSubmit} className="msg-form">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={isWaiting ? "Devin is thinking…" : "Ask Devin a question or add constraints…"}
        disabled={disabled}
        className="msg-input"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="msg-btn"
      >
        {loading ? "…" : "Send"}
      </button>

      <style jsx>{`
        .msg-form {
          display: flex;
          gap: 8px;
        }
        .msg-input {
          flex: 1;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          font-size: 14px;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 12px;
          outline: none;
          transition: border-color 100ms;
        }
        .msg-input:focus {
          border-color: var(--border-strong);
        }
        .msg-input::placeholder {
          color: var(--text-tertiary);
        }
        .msg-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .msg-btn {
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 100ms;
          white-space: nowrap;
        }
        .msg-btn:hover:not(:disabled) {
          border-color: var(--border-strong);
          color: var(--text);
        }
        .msg-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}
