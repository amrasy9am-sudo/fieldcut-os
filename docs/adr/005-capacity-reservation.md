# ADR-005 · Capacity reservation inside a write transaction

**Status:** accepted

**Context.** Two customers may try to book the last bowls in a slot at the same moment.

**Decision.** `createOrder` runs inside `BEGIN IMMEDIATE`, recomputes slot usage from `orders`, checks `held + confirmed + bowls ≤ capacity`, and inserts — all in one transaction. With the synchronous `node:sqlite` driver a transaction cannot interleave with another request. On Postgres the same function would use `SELECT … FOR UPDATE` on a slot row.

**Consequences.** The last bowl can never be sold twice. Usage is derived, so there is no counter to drift.
