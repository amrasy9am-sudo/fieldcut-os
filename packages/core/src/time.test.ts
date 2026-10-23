import { test } from "node:test";
import assert from "node:assert/strict";
import { cutoffFor, dateOptions, formatDateShort, holdUntilFor, isBookable, klDateKey, nextWeekMonday } from "./time.ts";

const at = (iso: string) => new Date(iso);

test("cut-off is 22:00 Malaysian time the night before", () => {
  assert.equal(cutoffFor("2026-11-03").toISOString(), "2026-11-02T14:00:00.000Z");
  assert.equal(holdUntilFor("2026-11-03").toISOString(), "2026-11-02T14:30:00.000Z");
});

test("21:59:59 is accepted, 22:00:00 is rejected", () => {
  const closed = new Set<string>();
  assert.equal(isBookable("2026-11-03", at("2026-11-02T21:59:59+08:00"), closed), true);
  assert.equal(isBookable("2026-11-03", at("2026-11-02T22:00:00+08:00"), closed), false);
});

test("Sundays and closed dates are not bookable", () => {
  const now = at("2026-11-02T09:00:00+08:00"); // Monday
  assert.equal(isBookable("2026-11-08", now, new Set()), false); // Sunday
  assert.equal(isBookable("2026-11-04", now, new Set(["2026-11-04"])), false);
  const opts = dateOptions(now, new Set());
  assert.equal(opts[0].reason, "Cut-off passed"); // today
  assert.equal(opts.find((o) => o.date === "2026-11-08")?.reason, "Closed");
  assert.equal(opts.filter((o) => o.bookable).length, 6);
});

test("dates use Malaysian time, not UTC", () => {
  assert.equal(klDateKey(at("2026-11-02T17:30:00Z")), "2026-11-03"); // 01:30 KL
  assert.equal(formatDateShort("2026-11-03"), "Tue 3 Nov");
});

test("next week's Monday", () => {
  assert.equal(nextWeekMonday(at("2026-11-04T10:00:00+08:00")), "2026-11-09");
  assert.equal(nextWeekMonday(at("2026-11-09T10:00:00+08:00")), "2026-11-16");
});
