# ADR-002 · No payment processing

**Status:** accepted

**Context.** Gateways add fees, KYC and PCI scope. The business settles cash on delivery or at pick-up.

**Decision.** The platform records a total due and a settlement status only. It never collects card or bank details. Risk is handled with trust tiers (ADR-006) instead of deposits.

**Consequences.** Zero payment fees and no PCI-DSS scope. No-shows are possible, so tiers and holds must be enforced on the server.
