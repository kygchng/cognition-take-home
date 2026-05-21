import { NextResponse } from "next/server";
import { getDevinClient } from "@/lib/devin";
import { upsertKnowledgeEntry, getKnowledgeByTag } from "@/lib/db";

const KNOWLEDGE_ENTRIES = [
  {
    tag: "superset-frontend-conventions",
    name: "Apache Superset – Frontend Conventions",
    body: `Apache Superset frontend lives in superset-frontend/src/.

Key conventions:
- TypeScript strict mode, no 'any' types
- Functional React components with hooks
- Import UI components from @superset-ui/core, not directly from antd
- State management: Redux for global state, hooks for local
- Testing: Jest + React Testing Library (no Enzyme)
- Use test() over describe() for flat test structure
- Run lint: cd superset-frontend && npm run lint
- Run type check: cd superset-frontend && npx tsc --noEmit
- Run tests: cd superset-frontend && npm run test

File structure:
- superset-frontend/src/components/ – reusable components
- superset-frontend/src/explore/ – chart builder
- superset-frontend/src/dashboard/ – dashboard interface
- superset-frontend/src/SqlLab/ – SQL editor
- superset-frontend/packages/superset-ui-core/ – UI library`,
    trigger_description:
      "Use when working on Apache Superset frontend TypeScript/React code",
    pinned_repos: ["apache/superset"],
  },
  {
    tag: "superset-backend-conventions",
    name: "Apache Superset – Backend Conventions",
    body: `Apache Superset backend lives in superset/.

Key conventions:
- Python with full type hints, mypy compliant
- Flask with Flask-AppBuilder for RBAC
- SQLAlchemy models with proper typing
- REST API endpoints under superset/views/
- Business logic in commands/ subdirectories with @transaction() decorators
- Marshmallow schemas for validation in schemas.py
- Run lint: pre-commit run ruff
- Run type check: pre-commit run mypy
- Run tests: pytest tests/unit_tests/

File structure:
- superset/models/ – SQLAlchemy database models
- superset/views/ – REST API endpoints
- superset/connectors/ – database connection adapters
- tests/unit_tests/ – unit tests
- tests/integration_tests/ – integration tests`,
    trigger_description:
      "Use when working on Apache Superset backend Python/Flask code",
    pinned_repos: ["apache/superset"],
  },
];

export const dynamic = "force-dynamic";

export async function POST() {
  const client = getDevinClient();
  const seeded: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const entry of KNOWLEDGE_ENTRIES) {
    try {
      const existing = await getKnowledgeByTag(entry.tag);
      if (existing) {
        skipped.push(entry.tag);
        continue;
      }
      const { id } = await client.createKnowledge({
        name: entry.name,
        body: entry.body,
        trigger_description: entry.trigger_description,
        pinned_repos: entry.pinned_repos,
      });
      await upsertKnowledgeEntry(entry.tag, id);
      seeded.push(entry.tag);
    } catch (err) {
      errors.push(`${entry.tag}: ${String(err)}`);
    }
  }

  return NextResponse.json({ seeded, skipped, errors });
}
