# ADR-008 · SQLite through node:sqlite for the first release

**Status:** accepted · revisit before serverless hosting

**Context.** The proposal planned Postgres + Drizzle. For a single-kitchen MVP, zero setup matters more: anyone cloning the repo should run it with `pnpm dev`.

**Decision.** Use Node's built-in `node:sqlite` driver with hand-written SQL in one repository module. All SQL lives in `apps/web/server`.

**Consequences.** No database server, no native build step, instant local setup. Serverless platforms have ephemeral disks, so production hosting on them needs a Postgres adapter for the same repository functions (on the roadmap). A single VPS or container with a persistent volume works as-is.
