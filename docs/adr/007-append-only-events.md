# ADR-007 · Append-only order events

**Status:** accepted

**Decision.** Every status change, confirmation and settlement inserts a row into `order_events` with actor and time. Status changes go through one state machine (`packages/core/src/machine.ts`).

**Consequences.** Full audit trail, a free customer tracking timeline, and metrics such as median time to confirm.
