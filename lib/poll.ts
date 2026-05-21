import { getDevinClient } from "./devin";
import {
  listSessions,
  updateSession,
  createAnalysis,
  getAnalysisBySessionId,
} from "./db";
import type { AnalysisResult, RiskFactor, SessionStatus } from "./types";

const DEVIN_STATUS_MAP: Record<string, SessionStatus> = {
  running: "running",
  completed: "completed",
  failed: "failed",
  blocked: "blocked",
  stopped: "stopped",
  suspended: "blocked",
};

export function shouldAutoApprove(result: AnalysisResult): boolean {
  const hasHighRisk = result.riskFactors.some((r) => r.severity === "high");
  return result.estimatedScope === "small" && !hasHighRisk;
}

function parseStructuredOutput(raw: unknown): AnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.summary !== "string" ||
    !Array.isArray(obj.plan) ||
    !Array.isArray(obj.filesToChange) ||
    !Array.isArray(obj.riskFactors) ||
    typeof obj.estimatedScope !== "string"
  ) {
    return null;
  }
  return {
    summary: obj.summary,
    plan: obj.plan as string[],
    filesToChange: obj.filesToChange as string[],
    riskFactors: obj.riskFactors as RiskFactor[],
    estimatedScope: obj.estimatedScope as "small" | "medium" | "large",
  };
}

export async function pollRunningSessions(): Promise<{
  updated: number;
  errors: string[];
}> {
  const client = getDevinClient();
  const sessions = await listSessions();
  const running = sessions.filter((s) => s.status === "running");

  let updated = 0;
  const errors: string[] = [];

  for (const session of running) {
    try {
      const devinSession = await client.getSession(session.devin_session_id);
      console.log(
        `[poll] session=${session.devin_session_id} status=${devinSession.status} status_enum=${devinSession.status_enum} has_output=${!!devinSession.structured_output}`
      );

      if (session.kind === "analyze" && devinSession.structured_output) {
        const existing = await getAnalysisBySessionId(session.devin_session_id);
        if (!existing) {
          const result = parseStructuredOutput(devinSession.structured_output);
          if (result) {
            await createAnalysis({
              session_id: session.devin_session_id,
              issue_number: session.issue_number,
              summary: result.summary,
              proposed_plan: result.plan,
              files_to_change: result.filesToChange,
              risk_factors: result.riskFactors,
              estimated_scope: result.estimatedScope,
              raw_output: JSON.stringify(devinSession.structured_output),
            });
            await updateSession(session.devin_session_id, {
              status: "completed",
              auto_approved: shouldAutoApprove(result),
              ...(typeof devinSession.acu_cost === "number" && {
                acu_cost: devinSession.acu_cost,
              }),
            });
            updated++;
            continue;
          }
        }
      }

      const newStatus: SessionStatus =
        DEVIN_STATUS_MAP[devinSession.status] ?? "running";
      if (newStatus === session.status) continue;

      const patch: Parameters<typeof updateSession>[1] = { status: newStatus };
      if (devinSession.pull_request?.url) patch.pr_url = devinSession.pull_request.url;
      if (typeof devinSession.acu_cost === "number") patch.acu_cost = devinSession.acu_cost;

      await updateSession(session.devin_session_id, patch);
      updated++;
    } catch (err) {
      errors.push(`${session.devin_session_id}: ${String(err)}`);
    }
  }

  return { updated, errors };
}
