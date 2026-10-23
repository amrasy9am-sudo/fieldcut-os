import { test } from "node:test";
import assert from "node:assert/strict";
import { BOWLS, bowlCogsSen, getBowl } from "./catalog.ts";
import { parseLine, priceLine, quoteOrder, planBowlPriceSen } from "./pricing.ts";

const classic = { slug: "field-classic", qty: 2, dressing: "HM", addOns: { "extra-egg": 1 }, leaveOut: ["corn"] } as const;

test("prices a bowl with add-ons in sen", () => {
  const line = priceLine({ ...classic, addOns: { ...classic.addOns }, leaveOut: [...classic.leaveOut] });
  assert.equal(line.unitSen, 1590 + 150);
  assert.equal(line.lineSen, (1590 + 150) * 2);
  assert.equal(line.kcal, 430 + 72);
  assert.equal(line.proteinG, 38 + 6);
  assert.equal(line.detail, "Honey Mustard · +egg · no corn");
});

test("swapping dressing changes kcal by the difference between dressings", () => {
  const line = priceLine({ slug: "field-classic", qty: 1, dressing: "LY", addOns: {}, leaveOut: [] });
  assert.equal(line.kcal, 430 - 105 + 55);
  assert.equal(line.unitSen, 1590);
});

test("price overrides from the console are applied", () => {
  const line = priceLine({ slug: "garden-two-egg", qty: 1, dressing: "LY", addOns: {}, leaveOut: [] }, { "garden-two-egg": 1290 });
  assert.equal(line.unitSen, 1290);
});

test("delivery needs a zone and a RM25 minimum", () => {
  const one = [{ slug: "garden-two-egg" as const, qty: 1, dressing: "LY" as const, addOns: {}, leaveOut: [] }];
  assert.match(quoteOrder({ lines: one, mode: "delivery", zone: "A" }).problems[0], /minimum of RM25/);
  assert.match(quoteOrder({ lines: one, mode: "delivery", zone: null }).problems[0], /outside our 8 km/);
  const pickup = quoteOrder({ lines: one, mode: "pickup", zone: null });
  assert.deepEqual(pickup.problems, []);
  assert.equal(pickup.totalSen, 1190);
  const three = quoteOrder({ lines: [{ ...one[0], qty: 3 }], mode: "delivery", zone: "B" });
  assert.deepEqual(three.problems, []);
  assert.equal(three.deliverySen, 500);
  assert.equal(three.totalSen, 1190 * 3 + 500);
});

test("parseLine rejects tampered input", () => {
  assert.equal(parseLine({ slug: "field-classic", qty: 0, dressing: "HM" }).ok, false);
  assert.equal(parseLine({ slug: "field-classic", qty: 1.5, dressing: "HM" }).ok, false);
  assert.equal(parseLine({ slug: "nasi-lemak", qty: 1, dressing: "HM" }).ok, false);
  assert.equal(parseLine({ slug: "field-classic", qty: 1, dressing: "XX" }).ok, false);
  assert.equal(parseLine({ slug: "field-classic", qty: 1, dressing: "HM", addOns: { "extra-egg": 9 } }).ok, false);
  const ok = parseLine({ slug: "field-classic", qty: 1, dressing: "HM", addOns: { "extra-egg": 0 }, leaveOut: ["corn", "corn"] });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.deepEqual(ok.value.addOns, {});
    assert.deepEqual(ok.value.leaveOut, ["corn"]);
  }
});

test("COGS matches the business proposal costing", () => {
  assert.equal(bowlCogsSen(getBowl("field-classic")!), 746);
  for (const b of BOWLS) assert.ok(bowlCogsSen(b) < b.priceSen, `${b.slug} must be profitable`);
});

test("five-day plan pricing", () => {
  assert.equal(planBowlPriceSen("field-classic") * 5, 7200);
  assert.equal(planBowlPriceSen("harbour-salmon"), 2240);
});
