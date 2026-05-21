# Auto-Remediate Dashboard

A Next.js 14 app that watches a GitHub repository for issues labeled `auto-remediate`, orchestrates a two-step Devin AI workflow (analyze → execute), and provides a dashboard for reviewing, chatting with, and approving AI-generated fixes.

## Demo Workflow

Here is the end-to-end flow once everything is set up:

1. Open a GitHub issue on your repo and apply the `auto-remediate` label (or create it with the label already attached).
2. The webhook fires → the app ingests the issue and spawns a Devin _analyze_ session.
3. Devin explores the codebase and produces a structured risk card: summary, step-by-step plan, files to change, risk factors, and scope estimate.
4. The dashboard shows the issue as **Needs Review**. Open the issue detail page.
5. In the **Analysis** card, optionally chat with Devin to refine the plan (e.g. _"only change the backend, leave the frontend"_). Devin responds in-thread.
6. When satisfied, click **Approve & Execute** (with an optional final note). A Devin _execute_ session starts.
7. Devin implements the fix, runs tests and pre-commit validation, and opens a pull request. The dashboard shows the PR link.

**Auto-approve shortcut:** If the analysis is small-scope and low-risk, the system skips human review entirely and goes straight to execution.

---

## Architecture

### Request Flow

```
GitHub Issue (labeled)
  → POST /api/webhooks/github     — HMAC-verified webhook intake
  → lib/analyze.ts                — creates Devin analyze session
  → Devin (async, hours)
  → POST /api/devin/poll          — called by AutoPoller every 30s
  → lib/poll.ts                   — detects structured_output, saves analysis
  → status: "blocked"             — Devin waits for reviewer
  → POST /api/issues/:n/message   — reviewer message forwarded to Devin live session
  → POST /api/issues/:n/approve   — spawns execute session, marks approved
  → lib/execute.ts                — creates Devin execute session
  → Devin (async, hours)
  → POST /api/devin/poll          — detects PR URL, marks completed
```

### Key Architecture Decisions

**Structured output as the completion signal** — Devin's `session.status` never reliably transitions to `completed`. The poll loop treats the presence of `structured_output` in the API response as the real signal, saves the analysis, then marks the session `"blocked"` so Devin stays alive for reviewer chat.

**Chat phase via blocked sessions** — Rather than ending the analyze session, Devin waits in a `"blocked"` state after producing the risk card. Reviewer messages are forwarded directly to the live session (`POST /session/:id/message`). The poll loop checks Devin's `messages` array for new responses and surfaces them in the UI.

**Knowledge seeding** — Devin is pre-loaded with Superset-specific conventions (frontend TypeScript rules, backend Python/mypy patterns, test strategy) as a Knowledge entry. This avoids Devin re-discovering project conventions from scratch on each session and improves the quality of both the analysis and the implementation.

---

## Stack

| Layer              | Technology                          |
| ------------------ | ----------------------------------- |
| Frontend + Backend | Next.js 14 App Router               |
| Database           | Supabase (Postgres)                 |
| AI Agent           | Devin v1 API                        |
| GitHub Integration | Octokit + HMAC webhook verification |
| Deployment         | Docker (standalone Next.js build)   |

---

## Setup

### Prerequisites

- Node.js 20+ (or Docker)
- A [Supabase](https://supabase.com) project
- A [Devin](https://devin.ai) API key
- A GitHub personal access token (`repo` scope)
- A publicly reachable URL for the webhook (ngrok works for local dev)

### 1. Environment Variables

```bash
cp .env.example .env
```

| Variable                    | Description                              |
| --------------------------- | ---------------------------------------- |
| `DEVIN_API_KEY`             | Devin API key                            |
| `GITHUB_TOKEN`              | GitHub PAT for reading issue details     |
| `GITHUB_WEBHOOK_SECRET`     | Secret used to verify webhook signatures |
| `SUPABASE_URL`              | Supabase project URL                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |

### 2. Database Schema

Run this once in the Supabase SQL editor:

```sql
create table issues (
  number        integer primary key,
  title         text not null,
  body          text,
  url           text not null,
  classified_as text,
  created_at    timestamptz default now()
);

create table sessions (
  devin_session_id  text primary key,
  kind              text not null,
  parent_session_id text,
  issue_number      integer references issues(number) on delete cascade,
  status            text not null,
  pr_url            text,
  acu_cost          numeric,
  devin_url         text not null,
  auto_approved     boolean default false,
  error_message     text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table analyses (
  session_id      text primary key references sessions(devin_session_id) on delete cascade,
  issue_number    integer references issues(number) on delete cascade,
  summary         text not null,
  proposed_plan   jsonb not null default '[]',
  files_to_change jsonb not null default '[]',
  risk_factors    jsonb not null default '[]',
  estimated_scope text not null,
  raw_output      text,
  user_messages   jsonb not null default '[]',
  approved_at     timestamptz,
  created_at      timestamptz default now()
);

create table knowledge_entries (
  tag       text primary key,
  devin_id  text not null
);
```

### 3. GitHub Webhook

1. Go to your repo → **Settings → Webhooks → Add webhook**
2. **Payload URL**: `https://<your-host>/api/webhooks/github`
3. **Content type**: `application/json`
4. **Secret**: the value of `GITHUB_WEBHOOK_SECRET`
5. **Events**: select **Individual events → Issues**

For local development: `ngrok http 3000` gives you a public URL.

### 4. Seed Devin Knowledge (optional)

The app can pre-load Devin with Superset-specific conventions so it doesn't have to re-discover them each session:

```bash
curl -X POST http://localhost:3000/api/admin/seed-knowledge
```

---

## Running

### Local

```bash
npm install
npm run dev    # http://localhost:3000
```

### Docker

```bash
docker compose up --build    # http://localhost:3000
```

---

## Auto-Approve Criteria

An analysis is auto-approved when **all** of the following hold:

- Estimated scope is `small`
- ≤ 5 files to change
- No risk factor with `high` severity
- No `breaking-change` risk factor at `medium` or `high` severity
