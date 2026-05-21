import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type {
  DbIssue,
  DbSession,
  DbAnalysis,
  IssueClassification,
  SessionKind,
  SessionStatus,
  RiskFactor,
} from "./types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function upsertIssue(payload: {
  number: number;
  title: string;
  body: string | null;
  url: string;
  classified_as: IssueClassification | null;
}): Promise<void> {
  const { error } = await supabase.from("issues").upsert(payload, {
    onConflict: "number",
  });
  if (error) throw error;
}

export async function getIssueByNumber(
  number: number
): Promise<DbIssue | null> {
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .eq("number", number)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as DbIssue | null;
}

export async function listIssues(): Promise<DbIssue[]> {
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbIssue[];
}

export async function createSession(payload: {
  devin_session_id: string;
  kind: SessionKind;
  parent_session_id?: string | null;
  issue_number: number;
  status: SessionStatus;
  devin_url: string;
}): Promise<void> {
  const { error } = await supabase.from("sessions").insert({
    parent_session_id: null,
    ...payload,
  });
  if (error) throw error;
}

export async function updateSession(
  devinSessionId: string,
  patch: Partial<{
    status: SessionStatus;
    pr_url: string | null;
    acu_cost: number | null;
    auto_approved: boolean;
    error_message: string | null;
  }>
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("devin_session_id", devinSessionId);
  if (error) throw error;
}

export async function getSessionByDevinId(
  id: string
): Promise<DbSession | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("devin_session_id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as DbSession | null;
}

export async function listSessions(): Promise<DbSession[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbSession[];
}

export async function listSessionsForIssue(
  issueNumber: number
): Promise<DbSession[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("issue_number", issueNumber)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbSession[];
}

export async function createAnalysis(payload: {
  session_id: string;
  issue_number: number;
  summary: string;
  proposed_plan: string[];
  files_to_change: string[];
  risk_factors: RiskFactor[];
  estimated_scope: "small" | "medium" | "large";
  raw_output: string;
}): Promise<void> {
  const { error } = await supabase
    .from("analyses")
    .insert({ ...payload, user_messages: [] });
  if (error && error.code !== "23505") throw error;
}

export async function getAnalysisBySessionId(
  sessionId: string
): Promise<DbAnalysis | null> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("session_id", sessionId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as DbAnalysis | null;
}

export async function getAnalysisByIssue(
  issueNumber: number
): Promise<DbAnalysis | null> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("issue_number", issueNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as DbAnalysis | null;
}

export async function approveAnalysis(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("analyses")
    .update({ approved_at: new Date().toISOString() })
    .eq("session_id", sessionId);
  if (error) throw error;
}

export async function appendUserMessage(
  sessionId: string,
  message: string
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("analyses")
    .select("user_messages")
    .eq("session_id", sessionId)
    .single();
  if (fetchError) throw fetchError;
  const current = (data?.user_messages as string[]) ?? [];
  const { error } = await supabase
    .from("analyses")
    .update({ user_messages: [...current, message] })
    .eq("session_id", sessionId);
  if (error) throw error;
}

export async function upsertKnowledgeEntry(
  tag: string,
  devinId: string
): Promise<void> {
  const { error } = await supabase
    .from("knowledge_entries")
    .upsert({ tag, devin_id: devinId }, { onConflict: "tag" });
  if (error) throw error;
}

export async function listKnowledgeDevinIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("devin_id");
  if (error) throw error;
  return (data ?? []).map((r) => r.devin_id);
}

export async function getKnowledgeByTag(
  tag: string
): Promise<{ tag: string; devin_id: string } | null> {
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("tag, devin_id")
    .eq("tag", tag)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}
