# ADR-006 · Phone number as customer identity, no customer accounts

**Status:** accepted

**Decision.** Customers are identified by their E.164 mobile number. There are no passwords for customers. Trust tiers (New, Regular, Trusted, Paused) are computed from each number's own order history and limit order value, open orders and access to plans.

**Consequences.** Ordering takes about a minute with no sign-up. Abuse is limited by tiers and expiring holds rather than by authentication.
