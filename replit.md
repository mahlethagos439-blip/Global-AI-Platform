# Global AI Platform

A mobile-first personal AI operating system that helps people move from problems to understanding, plans, execution, and measurable outcomes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/global-ai-platform/src/` — responsive web app, auth routes, dashboard, chat, agents, projects, memory, preferences, plans, and trust/help surfaces
- `artifacts/api-server/src/routes/platform.ts` — first platform API surface with seed data and honest orchestrator preview behavior
- `lib/api-spec/openapi.yaml` — source of truth for platform contracts and generated hooks
- `lib/api-client-react/src/generated/` — generated React Query client
- `lib/api-zod/src/generated/` — generated request/response validation
- `artifacts/global-ai-platform/src/index.css` — visual system and responsive styling

## Architecture decisions

- The product is organized around a problem-to-outcome loop, with 15 specialized agents behind an orchestrator rather than a single chat persona.
- Live AI and external integrations are explicit capability states. The UI never claims a provider is connected when it is not.
- The first backend surface is contract-first and provider-agnostic, so model selection, citations, permissions, and integrations can expand without changing the frontend information architecture.
- Clerk is the authentication foundation; browser requests use same-origin session cookies rather than custom token plumbing.

## Product

The first B2C foundation includes a public entry experience, account flows, a personal dashboard, AI conversation workspace, all 15 problem-area agents, personal projects, user-controlled memory, localization preferences, plan comparison with mock checkout state, integration capability catalog, and trust/help guidance. It is designed to extend into B2B workspaces, company knowledge, permissions, audit logs, analytics, and business integrations.

## User preferences

- Preserve long-term product capabilities even when a live API or integration is not connected.
- Do not represent mock subscription flows or orchestrator previews as real billing or live model execution.

## Gotchas

- API data in `platform.ts` is currently seeded/in-memory so the product can be demonstrated without requiring a live provider; persistence and user scoping are follow-up work.
- If the OpenAPI contract changes, regenerate both the React client and Zod validators before consuming new hooks.
- The web app expects the managed artifact workflow to supply `PORT` and `BASE_PATH`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
