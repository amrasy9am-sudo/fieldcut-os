# ADR-003 · WhatsApp click-to-chat instead of the Business API

**Status:** accepted

**Decision.** The order is saved first, then the customer sends a pre-filled `wa.me/60142434391` message from their own number. Owner replies use pre-filled `wa.me` links too.

**Consequences.** No API account or monthly fee; the customer's own message proves their number. The database (not the chat text) is the source of truth, so every message carries a reference and an HMAC verify code.
