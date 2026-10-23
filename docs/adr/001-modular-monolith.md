# ADR-001 · Modular monolith on Next.js

**Status:** accepted

**Context.** One founder runs the kitchen and the software. Expected load is 50–100 orders a day.

**Decision.** One Next.js app (storefront + console) and one domain package (`packages/core`) in a pnpm workspace. No separate API service.

**Consequences.** One deploy and one database. Business rules stay framework-free, so splitting into services later doesn't require rewriting them.
