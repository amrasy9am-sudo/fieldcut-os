import { test } from "node:test";
import assert from "node:assert/strict";
import { nextEvents, STATUSES, transition, TRANSITIONS, type OrderEvent } from "./machine.ts";

test("happy path for a delivery", () => {
  let s = transition("SUBMITTED", "confirm", "owner");
  assert.ok(s.ok && s.next === "CONFIRMED");
  s = transition("CONFIRMED", "lock", "system");
  assert.ok(s.ok && s.next === "IN_PREP");
  s = transition("IN_PREP", "pack", "owner");
  assert.ok(s.ok && s.next === "PACKED");
  s = transition("PACKED", "dispatch", "owner");
  assert.ok(s.ok && s.next === "OUT_FOR_DELIVERY");
  s = transition("OUT_FOR_DELIVERY", "complete", "owner");
  assert.ok(s.ok && s.next === "COMPLETED");
});

test("every illegal transition is rejected", () => {
  const events: OrderEvent[] = ["confirm", "expire", "cancel", "lock", "pack", "dispatch", "ready", "complete", "no_show"];
  for (const status of STATUSES) {
    for (const e of events) {
      const legal = TRANSITIONS[status]?.[e] !== undefined;
      const r = transition(status, e, e === "expire" ? "system" : "owner");
      if (!legal) assert.equal(r.ok, false, `${status} + ${e} should be illegal`);
    }
  }
});

test("customers can only cancel", () => {
  assert.equal(transition("SUBMITTED", "confirm", "customer").ok, false);
  assert.equal(transition("SUBMITTED", "cancel", "customer").ok, true);
  assert.equal(transition("IN_PREP", "cancel", "customer").ok, false);
});

test("next actions depend on fulfilment mode", () => {
  assert.deepEqual(nextEvents("PACKED", "delivery"), ["dispatch"]);
  assert.deepEqual(nextEvents("PACKED", "pickup"), ["ready"]);
});
