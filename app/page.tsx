import Link from "next/link";
import { listIssues, listSessions, listAnalyses } from "@/lib/db";
import AutoPoller from "@/components/AutoPoller";
import PollButton from "@/components/PollButton";
import type { SessionStatus, IssueClassification } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  queued:    { bg: "var(--pill-queued-bg)",    color: "var(--pill-queued-text)" },
  running:   { bg: "var(--pill-running-bg)",   color: "var(--pill-running-text)" },
  completed: { bg: "var(--pill-completed-bg)", color: "var(--pill-completed-text)" },
  failed:    { bg: "var(--pill-failed-bg)",    color: "var(--pill-failed-text)" },
  blocked:   { bg: "var(--pill-blocked-bg)",   color: "var(--pill-blocked-text)" },
  stopped:   { bg: "var(--pill-stopped-bg)",   color: "var(--pill-stopped-text)" },
};

function StatusPill({ status }: { status: SessionStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.stopped;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {status === "running" && (
        <span
          className="pulse-dot w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: s.color }}
        />
      )}
      {status}
    </span>
  );
}

const CLASS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  vulnerability: { bg: "var(--cat-breaking-bg)", color: "var(--cat-breaking-text)", label: "vulnerability" },
  "dep-upgrade": { bg: "var(--cat-external-bg)", color: "var(--cat-external-text)", label: "dep-upgrade" },
  "code-quality": { bg: "var(--cat-scope-bg)",   color: "var(--cat-scope-text)",    label: "code-quality" },
};

function ClassBadge({ cls }: { cls: IssueClassification | null }) {
  if (!cls) return <span className="text-text-tertiary text-xs">—</span>;
  const c = CLASS_STYLE[cls] ?? { bg: "var(--bg-hover)", color: "var(--text-secondary)", label: cls };
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-pill font-mono text-xs font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

const SCOPE_STYLE: Record<string, { bg: string; color: string }> = {
  small:  { bg: "var(--pill-completed-bg)", color: "var(--pill-completed-text)" },
  medium: { bg: "var(--pill-running-bg)",   color: "var(--pill-running-text)" },
  large:  { bg: "var(--pill-blocked-bg)",   color: "var(--pill-blocked-text)" },
};

function ScopeBadge({ scope }: { scope: "small" | "medium" | "large" | null }) {
  if (!scope) return <span className="text-text-tertiary text-xs">—</span>;
  const s = SCOPE_STYLE[scope] ?? { bg: "var(--bg-hover)", color: "var(--text-secondary)" };
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-pill font-mono text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {scope}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: accent ? "var(--accent)" : "var(--text)",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

const FILTERS = [
  { key: "all",          label: "All" },
  { key: "needs-review", label: "Needs Review" },
  { key: "in-progress",  label: "In Progress" },
  { key: "completed",    label: "Completed" },
  { key: "failed",       label: "Failed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const { filter: rawFilter } = searchParams;
  const activeFilter: FilterKey =
    FILTERS.find((f) => f.key === rawFilter)?.key ?? "all";

  const [issues, sessions, analyses] = await Promise.all([
    listIssues(),
    listSessions(),
    listAnalyses(),
  ]);

  const analysisByIssue = new Map(analyses.map((a) => [a.issue_number, a]));

  const rows = issues.map((issue) => {
    const issueSessions = sessions.filter((s) => s.issue_number === issue.number);
    const analyzeSession = issueSessions.find((s) => s.kind === "analyze") ?? null;
    const executeSession = issueSessions.filter((s) => s.kind === "execute").at(-1) ?? null;
    const analysis = analysisByIssue.get(issue.number) ?? null;

    const analyzeStatus: SessionStatus = analysis
      ? "completed"
      : (analyzeSession?.status as SessionStatus) ?? "queued";

    return { issue, analyzeSession, executeSession, analysis, analyzeStatus };
  });

  const runningCount = rows.filter(({ analyzeSession, executeSession, analysis }) => {
    if (analyzeSession?.status === "running" && !analysis) return true;
    if (executeSession?.status === "running") return true;
    return false;
  }).length;
  const hasRunning = runningCount > 0;

  const totalIssues = issues.length;
  const analyzedCount = analyses.length;
  const awaitingReview = rows.filter(
    ({ analysis, executeSession }) =>
      analysis && !analysis.approved_at && !executeSession
  ).length;
  const executingCount = rows.filter(
    ({ executeSession }) =>
      executeSession &&
      (executeSession.status === "running" || executeSession.status === "queued")
  ).length;
  const prsOpened = sessions.filter((s) => s.kind === "execute" && s.pr_url).length;

  const autoApprovedCount = analyses.filter((a) => {
    const session = sessions.find(
      (s) => s.devin_session_id === a.session_id && s.kind === "analyze"
    );
    return session?.auto_approved;
  }).length;
  const autoApprovalRate =
    analyzedCount > 0 ? Math.round((autoApprovedCount / analyzedCount) * 100) : null;

  const executedCount = sessions.filter((s) => s.kind === "execute").length;
  const successRate =
    executedCount > 0 ? Math.round((prsOpened / executedCount) * 100) : null;

  const filteredRows = rows.filter(({ issue, analyzeSession, executeSession, analysis, analyzeStatus }) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "needs-review") {
      return analysis && !analysis.approved_at && !executeSession;
    }
    if (activeFilter === "in-progress") {
      const sessions = [analyzeSession, executeSession].filter(Boolean);
      return sessions.some(
        (s) => s!.status === "running" || s!.status === "queued"
      );
    }
    if (activeFilter === "completed") {
      return (
        executeSession &&
        (executeSession.pr_url || executeSession.status === "completed")
      );
    }
    if (activeFilter === "failed") {
      const sessions = [analyzeSession, executeSession].filter(Boolean);
      return sessions.some((s) => s!.status === "failed");
    }
    return true;
  });

  return (
    <div>
      <AutoPoller enabled={hasRunning} />

      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {totalIssues} tracked
            {runningCount > 0 && (
              <>
                <span className="mx-1.5 text-text-tertiary">·</span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="pulse-dot w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: "var(--pill-running-text)" }}
                  />
                  {runningCount} running
                </span>
              </>
            )}
          </p>
        </div>
        {hasRunning && <PollButton />}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Issues" value={totalIssues} />
        <StatCard label="Analyzed" value={analyzedCount} />
        <StatCard label="Awaiting Review" value={awaitingReview} accent={awaitingReview > 0} />
        <StatCard label="Executing" value={executingCount} />
        <StatCard label="PRs Opened" value={prsOpened} accent={prsOpened > 0} />
      </div>

      {(autoApprovalRate !== null || successRate !== null) && (
        <div
          style={{
            display: "flex",
            gap: 20,
            marginBottom: 20,
            padding: "10px 14px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-tertiary)", marginRight: 6, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 10 }}>
              Auto-approval rate
            </span>
            <span className="font-mono font-medium" style={{ color: "var(--text)" }}>
              {autoApprovalRate !== null ? `${autoApprovalRate}%` : "—"}
            </span>
          </span>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-tertiary)", marginRight: 6, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 10 }}>
              Execution success
            </span>
            <span className="font-mono font-medium" style={{ color: "var(--text)" }}>
              {successRate !== null ? `${successRate}%` : "—"}
            </span>
          </span>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-tertiary)", marginRight: 6, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 10 }}>
              PRs / executes
            </span>
            <span className="font-mono font-medium" style={{ color: "var(--text)" }}>
              {prsOpened}/{executedCount}
            </span>
          </span>
        </div>
      )}

      {totalIssues > 0 && (
        <div
          style={{
            display: "flex",
            gap: 2,
            marginBottom: 14,
          }}
        >
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/" : `/?filter=${f.key}`}
              className={`filter-tab${activeFilter === f.key ? " active" : ""}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      )}

      {totalIssues === 0 ? (
        <div
          className="text-center py-24 text-sm text-text-tertiary"
          style={{ border: "1px dashed var(--border)", borderRadius: 8 }}
        >
          No issues yet.{" "}
          <span className="font-mono">
            Create one on kygchng/superset with the{" "}
            <span
              style={{ color: "var(--cat-scope-text)", background: "var(--cat-scope-bg)" }}
              className="px-1.5 py-0.5 rounded"
            >
              auto-remediate
            </span>{" "}
            label.
          </span>
        </div>
      ) : filteredRows.length === 0 ? (
        <div
          className="text-center py-16 text-sm text-text-tertiary"
          style={{ border: "1px dashed var(--border)", borderRadius: 8 }}
        >
          No issues match this filter.
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            className="table-grid px-5 py-2.5"
            style={{
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span className="section-label">#</span>
            <span className="section-label">Title</span>
            <span className="section-label">Type</span>
            <span className="section-label">Scope</span>
            <span className="section-label">Analyze</span>
            <span className="section-label">Execute</span>
          </div>

          {filteredRows.map(({ issue, analyzeSession, executeSession, analysis, analyzeStatus }, i) => (
            <Link
              key={issue.number}
              href={`/issues/${issue.number}`}
              className="issue-row table-grid px-5 py-3.5 block"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span className="font-mono text-xs text-text-tertiary">
                {issue.number}
              </span>

              <span className="text-sm font-medium truncate pr-4">
                {issue.title}
              </span>

              <span>
                <ClassBadge cls={issue.classified_as} />
              </span>

              <span>
                <ScopeBadge scope={analysis?.estimated_scope ?? null} />
              </span>

              <span>
                {analyzeSession ? (
                  <div className="flex items-center gap-1.5">
                    <StatusPill status={analyzeStatus} />
                    {analyzeSession.auto_approved && (
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--pill-completed-text)" }}
                        title="Auto-approved"
                      >
                        auto
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-text-tertiary text-xs">—</span>
                )}
              </span>

              <span>
                {executeSession ? (
                  <div className="flex items-center gap-2">
                    <StatusPill status={executeSession.status as SessionStatus} />
                    {executeSession.pr_url && (
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--accent)" }}
                        title={executeSession.pr_url}
                      >
                        ↗ PR
                      </span>
                    )}
                  </div>
                ) : analysis?.approved_at ? (
                  <span className="text-text-tertiary text-xs">queued</span>
                ) : (
                  <span className="text-text-tertiary text-xs">—</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
