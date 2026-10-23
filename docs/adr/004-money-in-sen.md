# ADR-004 · Money as integer sen

**Status:** accepted

**Decision.** Every amount is an integer number of sen (RM1.00 = 100). Formatting happens only at the edge (`formatRM`).

**Consequences.** No floating-point rounding errors in totals, add-ons or delivery fees.
