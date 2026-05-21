export type RiskSeverity = "low" | "medium" | "high";

export type RiskCategory =
  | "breaking-change"
  | "test-coverage"
  | "scope"
  | "ambiguity"
  | "external-dependency";

export type RiskFactor = {
  category: RiskCategory;
  description: string;
  severity: RiskSeverity;
};

export type AnalysisResult = {
  summary: string;
  plan: string[];
  filesToChange: string[];
  riskFactors: RiskFactor[];
  estimatedScope: "small" | "medium" | "large";
};

export type IssueClassification =
  | "vulnerability"
  | "dep-upgrade"
  | "code-quality";

export type SessionKind = "analyze" | "execute";

export type SessionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "stopped";

export type DbIssue = {
  number: number;
  title: string;
  body: string | null;
  url: string;
  classified_as: IssueClassification | null;
  created_at: string | null;
};

export type DbSession = {
  devin_session_id: string;
  kind: SessionKind;
  parent_session_id: string | null;
  issue_number: number;
  status: SessionStatus;
  pr_url: string | null;
  acu_cost: number | null;
  devin_url: string;
  auto_approved: boolean | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DbAnalysis = {
  session_id: string;
  issue_number: number;
  summary: string;
  proposed_plan: string[];
  files_to_change: string[];
  risk_factors: RiskFactor[];
  estimated_scope: "small" | "medium" | "large";
  raw_output: string;
  user_messages: string[];
  approved_at: string | null;
  created_at: string | null;
};
