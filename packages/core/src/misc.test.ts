import { test } from "node:test";
import assert from "node:assert/strict";
import { CROCKFORD, isValidRef, makeRef, normalizeRef, randomRefBody } from "./reference.ts";
import { displayPhone, normalizeMyPhone } from "./phone.ts";
import { availability, canReserve } from "./slots.ts";
import { checkTierLimits, tierFor } from "./trust.ts";
import { explode } from "./prep.ts";
import { renderOrderMessage, waLink } from "./relay.ts";
import { bytesToCode, canonicalJSON } from "./canonical.ts";

test("references carry a check character that catches any single typo", () => {
  const ref = makeRef("2026-11-02", "K7M4");
  assert.match(ref, /^FC-261102-K7M4.$/);
  assert.ok(isValidRef(ref));
  const chars = ref.split("");
  for (const i of [3, 4, 5, 6, 7, 8, 10, 11, 12, 13]) {
    for (const c of CROCKFORD) {
      if (c === chars[i] || (i < 9 && !/\d/.test(c))) continue;
      const typo = [...chars];
      typo[i] = c;
      assert.equal(isValidRef(typo.join("")), false, `typo at ${i} → ${c}`);
    }
  }
  assert.ok(isValidRef(makeRef("2026-11-02", randomRefBody())));
  assert.equal(normalizeRef(" fc 261102 k7m4" + ref.slice(-1).toLowerCase()), ref);
});

test("Malaysian phone numbers", () => {
  assert.equal(normalizeMyPhone("012-345 6789"), "+60123456789");
  assert.equal(normalizeMyPhone("+60 11-2345 6789"), "+601123456789");
  assert.equal(normalizeMyPhone("60142434391"), "+60142434391");
  assert.equal(normalizeMyPhone("03-1234 5678"), null);
  assert.equal(normalizeMyPhone("hello"), null);
  assert.equal(displayPhone("+60123456789"), "012-345 6789");
  assert.equal(displayPhone("+601123456789"), "011-2345 6789");
});

test("capacity never oversells", () => {
  const usage = { capacity: 15, held: 4, confirmed: 8 };
  assert.equal(canReserve(usage, 3), true);
  assert.equal(canReserve(usage, 4), false);
  assert.equal(availability({ id: 2, label: "12–13" }, usage).left, 3);
  assert.equal(availability({ id: 2, label: "12–13" }, { capacity: 10, held: 0, confirmed: 10 }).state, "full");
});

test("trust tiers and limits", () => {
  assert.equal(tierFor({ completed: 0, noShowsLast60Days: 0 }), "new");
  assert.equal(tierFor({ completed: 2, noShowsLast60Days: 0 }), "regular");
  assert.equal(tierFor({ completed: 7, noShowsLast60Days: 0 }), "trusted");
  assert.equal(tierFor({ completed: 9, noShowsLast60Days: 2 }), "paused");
  assert.match(checkTierLimits({ tier: "new", orderTotalSen: 6670, openOrders: 0, isPlan: false })!, /RM60/);
  assert.equal(checkTierLimits({ tier: "new", orderTotalSen: 5000, openOrders: 0, isPlan: false }), null);
  assert.match(checkTierLimits({ tier: "new", orderTotalSen: 5000, openOrders: 1, isPlan: false })!, /one open order/);
  assert.match(checkTierLimits({ tier: "new", orderTotalSen: 7200, openOrders: 0, isPlan: true })!, /plans unlock/);
});

test("prep engine explodes orders into a weighed prep list", () => {
  const plan = explode([
    { slug: "field-classic", qty: 12, dressing: "HM", addOns: { "extra-egg": 1 }, leaveOut: [] },
    { slug: "harbour-salmon", qty: 6, dressing: "LY", addOns: {}, leaveOut: ["corn"] },
  ]);
  assert.equal(plan.totalBowls, 18);
  const get = (id: string) => plan.ingredients.find((i) => i.id === id)!.qty;
  assert.equal(get("chicken"), Math.ceil(12 * 130 * 1.05));
  assert.equal(get("egg"), 12 * 2 + 6);
  assert.equal(get("corn"), Math.ceil(12 * 20 * 1.05));
  assert.equal(get("salmon"), Math.ceil(6 * 120 * 1.05));
  assert.deepEqual(plan.dressingCups, { HM: 12, RS: 0, LY: 6 });
});

test("WhatsApp message and link", () => {
  const msg = renderOrderMessage({
    ref: "FC-261102-K7M4R", verifyCode: "3F9K-QX2M", name: "Aina Sofea", phone: "+60123456789",
    mode: "delivery", zone: "B", areaName: "Sitiawan", address: "No. 12, Jalan Cempaka 4", notes: null,
    date: "2026-11-02", slotLabel: "12:00–13:00",
    lines: [{ qty: 2, name: "The Field Classic", detail: "Honey Mustard · +egg", lineSen: 3480 }],
    subtotalSen: 3480, deliverySen: 500, totalSen: 3980, settlement: "Cash on delivery", trackUrl: "https://fieldcut.app/t/K7M4R",
  });
  assert.match(msg, /Ref: \*FC-261102-K7M4R\*/);
  assert.match(msg, /Verify: 3F9K-QX2M/);
  assert.match(msg, /\*TOTAL DUE RM39\.80\*/);
  assert.match(msg, /Phone: 012-345 6789/);
  assert.ok(msg.length < 1500);
  assert.equal(waLink("Hi & bye"), "https://wa.me/60142434391?text=Hi%20%26%20bye");
});

test("canonical JSON and verify code formatting", () => {
  assert.equal(canonicalJSON({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}');
  assert.match(bytesToCode(new Uint8Array([1, 2, 3, 4, 5, 6])), /^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
});
