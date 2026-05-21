import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getIssueByNumber,
  getAnalysisByIssue,
  listSessionsForIssue,
} from "@/lib/db";
import AutoPoller from "@/components/AutoPoller";
import ActionPanel from "@/components/ActionPanel";
import type { RiskFactor, ConversationMessage, SessionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  queued:    { bg: "var(--pill-queued-bg)",    color: "var(--pill-queued-text)" },
  running:   { bg: "var(--pill-running-bg)",   color: "var(--pill-running-text)" },
  completed: { bg: "var(--pill-completed-bg)", color: "var(--pill-completed-text)" },
  failed:    { bg: "var(--pill-failed-bg)",    color: "var(--pill-failed-text)" },
  blocked:   { bg: "var(--pill-blocked-bg)",   color: "var(--pill-blocked-text)" },
  stopped:   { bg: "var(--pill-stopped-bg)",   color: "var(--pill-stopped-text)" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.stopped;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {status === "running" && (
        <span
          className="pulse-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: s.color,
            flexShrink: 0,
          }}
        />
      )}
      {status}
    </span>
  );
}

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  "breaking-change":     { bg: "var(--cat-breaking-bg)", color: "var(--cat-breaking-text)" },
  "test-coverage":       { bg: "var(--cat-test-bg)",     color: "var(--cat-test-text)" },
  "scope":               { bg: "var(--cat-scope-bg)",    color: "var(--cat-scope-text)" },
  "ambiguity":           { bg: "var(--cat-ambiguity-bg)",color: "var(--cat-ambiguity-text)" },
  "external-dependency": { bg: "var(--cat-external-bg)", color: "var(--cat-external-text)" },
};

const SEV_STYLE: Record<string, { bg: string; color: string }> = {
  low:    { bg: "transparent",              color: "var(--text-tertiary)" },
  medium: { bg: "var(--pill-running-bg)",   color: "var(--pill-running-text)" },
  high:   { bg: "var(--pill-failed-bg)",    color: "var(--pill-failed-text)" },
};

const SCOPE_COLOR: Record<string, string> = {
  small:  "var(--pill-completed-text)",
  medium: "var(--pill-running-text)",
  large:  "var(--pill-failed-text)",
};

function Card({
  children,
  tinted = false,
}: {
  children: React.ReactNode;
  tinted?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: tinted ? "#f0f4ff" : "var(--bg)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({
  label,
  badge,
  right,
}: {
  label: string;
  badge?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(0,0,0,0.018)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </span>
        {badge}
      </div>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {right}
        </div>
      )}
    </div>
  );
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "20px 20px" }}>{children}</div>;
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
        marginBottom: 10,
        marginTop: 0,
      }}
    >
      {children}
    </p>
  );
}

function InternalDivider() {
  return (
    <div
      style={{ borderTop: "1px solid var(--border)", margin: "20px 0" }}
    />
  );
}

function DevinBadge() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: "#e8f0fe",
        color: "#1a56db",
        padding: "2px 7px",
        borderRadius: 3,
      }}
    >
      Devin
    </span>
  );
}

function ExternalLink({
  href,
  children,
  muted = false,
}: {
  href: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ext-link"
      style={{
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 12,
        color: muted ? "var(--text-secondary)" : "var(--accent)",
      }}
    >
      {children}
    </a>
  );
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function IssuePage({
  params,
}: {
  params: { number: string };
}) {
  const issueNumber = parseInt(params.number);
  if (isNaN(issueNumber)) notFound();

  const [issue, analysis, sessions] = await Promise.all([
    getIssueByNumber(issueNumber),
    getAnalysisByIssue(issueNumber),
    listSessionsForIssue(issueNumber),
  ]);

  if (!issue) notFound();

  const analyzeSession = sessions.find((s) => s.kind === "analyze") ?? null;
  const executeSession = sessions.filter((s) => s.kind === "execute").at(-1) ?? null;
  const analyzeStatus: SessionStatus = analysis ? "completed" : (analyzeSession?.status as SessionStatus) ?? "running";
  const hasRunning = sessions.some((s) => {
    if (s.status !== "running") return false;
    if (s.kind === "analyze" && analysis) return false;
    return true;
  });
  const isApproved = !!analysis?.approved_at;

  const plan  = analysis ? (analysis.proposed_plan  as string[])              : [];
  const files = analysis ? (analysis.files_to_change as string[])              : [];
  const risks = analysis ? (analysis.risk_factors    as RiskFactor[])          : [];
  const msgs  = analysis ? (analysis.user_messages   as ConversationMessage[]) : [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <AutoPoller enabled={hasRunning} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        <Link
          href="/"
          style={{ color: "var(--text-secondary)", textDecoration: "none" }}
        >
          Issues
        </Link>
        <span style={{ color: "var(--text-tertiary)" }}>/</span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          #{issue.number}
        </span>
      </div>

      <h1
        style={{
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.35,
          marginBottom: 24,
          color: "var(--text)",
        }}
      >
        {issue.title}
      </h1>

      <Card>
        <CardHeader
          label="Issue"
          right={<ExternalLink href={issue.url}>#{issue.number} on GitHub ↗</ExternalLink>}
        />
        <CardBody>
          {issue.body ? (
            <pre
              style={{
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--text)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {issue.body}
            </pre>
          ) : (
            <p
              style={{
                fontSize: 14,
                color: "var(--text-tertiary)",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              No description provided.
            </p>
          )}
        </CardBody>
      </Card>

      <div style={{ height: 12 }} />

      <Card tinted>
        <CardHeader
          label="Analysis"
          badge={<DevinBadge />}
          right={
            analysis ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: SCOPE_COLOR[analysis.estimated_scope] ?? "var(--text-secondary)",
                  }}
                >
                  {analysis.estimated_scope} scope
                </span>
                <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>·</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {files.length} file{files.length !== 1 ? "s" : ""}
                </span>
                {analyzeSession && (
                  <>
                    <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>·</span>
                    <ExternalLink href={analyzeSession.devin_url} muted>
                      Devin ↗
                    </ExternalLink>
                  </>
                )}
              </div>
            ) : analyzeSession ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                <span
                  className="pulse-dot"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pill-running-text)", display: "inline-block" }}
                />
                Analyzing…
              </div>
            ) : null
          }
        />

        {!analysis ? (
          <CardBody>
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0, textAlign: "center", padding: "20px 0" }}>
              {analyzeSession ? "Analysis in progress…" : "No analysis yet."}
            </p>
          </CardBody>
        ) : (
          <CardBody>
            <div style={{ marginBottom: plan.length > 0 ? 20 : 0 }}>
              <SubLabel>Summary</SubLabel>
              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65, margin: 0 }}>
                {analysis.summary}
              </p>
            </div>

            {plan.length > 0 && (
              <>
                <InternalDivider />
                <div>
                  <SubLabel>Plan</SubLabel>
                  <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.map((step, i) => (
                      <li key={i} style={{ display: "flex", gap: 12 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), monospace",
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            flexShrink: 0,
                            marginTop: 2,
                            minWidth: 20,
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {files.length > 0 && (
              <>
                <InternalDivider />
                <SubLabel>Files · {files.length}</SubLabel>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 7,
                    overflow: "hidden",
                  }}
                >
                  {files.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 11,
                        padding: "6px 14px",
                        color: "var(--text-secondary)",
                        borderTop: i === 0 ? "none" : "1px solid var(--border)",
                        background: i % 2 === 0 ? "var(--bg)" : "#eef2ff",
                      }}
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </>
            )}

            {risks.length > 0 && (
              <>
                <InternalDivider />
                <SubLabel>Risk Factors</SubLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {risks.map((r, i) => {
                    const cat = CAT_STYLE[r.category] ?? { bg: "var(--bg-hover)", color: "var(--text-secondary)" };
                    const sev = SEV_STYLE[r.severity]  ?? SEV_STYLE.low;
                    return (
                      <div
                        key={i}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 7,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span
                            style={{
                              fontFamily: "var(--font-jetbrains-mono), monospace",
                              fontSize: 11,
                              fontWeight: 500,
                              padding: "2px 7px",
                              borderRadius: 3,
                              background: cat.bg,
                              color: cat.color,
                            }}
                          >
                            {r.category}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              padding: "2px 7px",
                              borderRadius: 3,
                              background: sev.bg,
                              color: sev.color,
                            }}
                          >
                            {r.severity}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                          {r.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardBody>
        )}
      </Card>

      <div style={{ height: 12 }} />

      <Card>
        <CardHeader
          label="Execution"
          badge={<DevinBadge />}
          right={
            executeSession?.pr_url ? (
              <ExternalLink href={executeSession.pr_url}>Pull Request ↗</ExternalLink>
            ) : undefined
          }
        />
        <CardBody>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analyzeSession && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, minWidth: 60 }}>Analyze</span>
                  <StatusPill status={analyzeStatus} />
                  {analyzeSession.auto_approved && (
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 11,
                        color: "var(--pill-completed-text)",
                      }}
                    >
                      auto-approved
                    </span>
                  )}
                </div>
                <ExternalLink href={analyzeSession.devin_url} muted>Devin ↗</ExternalLink>
              </div>
            )}

            {executeSession && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, minWidth: 60 }}>Execute</span>
                  <StatusPill status={executeSession.status as SessionStatus} />
                </div>
                <ExternalLink href={executeSession.devin_url} muted>Devin ↗</ExternalLink>
              </div>
            )}

            {!analyzeSession && !executeSession && (
              <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
                No sessions yet.
              </p>
            )}
          </div>

          {msgs.length > 0 && (
            <>
              <InternalDivider />
              <SubLabel>Reviewer Notes</SubLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {msgs.map((msg, i) => (
                  <div key={i} style={{ display: "flex", gap: 10 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 11,
                        color: msg.role === "user" ? "var(--accent)" : "var(--text-tertiary)",
                        flexShrink: 0,
                        marginTop: 1,
                        minWidth: 36,
                      }}
                    >
                      {msg.role === "user" ? "you" : "devin"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>
                        {msg.content}
                      </p>
                      {msg.timestamp && (
                        <p
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), monospace",
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            marginTop: 3,
                            marginBottom: 0,
                          }}
                        >
                          {formatTs(msg.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {analysis && !isApproved && (
            <>
              <InternalDivider />
              <ActionPanel issueNumber={issue.number} />
            </>
          )}

          {isApproved && !executeSession && (
            <>
              <InternalDivider />
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
                <span
                  className="pulse-dot"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pill-running-text)", display: "inline-block" }}
                />
                Approved — waiting for execute session to start…
              </div>
            </>
          )}

          {isApproved && executeSession?.pr_url && (
            <>
              <InternalDivider />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "var(--pill-completed-bg)",
                    color: "var(--pill-completed-text)",
                  }}
                >
                  complete
                </span>
                <ExternalLink href={executeSession.pr_url}>View Pull Request ↗</ExternalLink>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <div style={{ height: 40 }} />
    </div>
  );
}
