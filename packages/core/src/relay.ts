import { formatRM, type Sen } from "./money.ts";
import { displayPhone } from "./phone.ts";
import { formatDateLong, formatDateShort, type DateKey } from "./time.ts";

/** The kitchen's WhatsApp line, 014-243 4391. */
export const KITCHEN_WHATSAPP = "60142434391";
export const KITCHEN_WHATSAPP_DISPLAY = "014-243 4391";

const RULE = "──────────────";

export type RelayLine = { qty: number; name: string; detail: string; lineSen: Sen };

export type RelayOrder = {
  ref: string;
  verifyCode: string;
  name: string;
  phone: string;
  mode: "delivery" | "pickup";
  zone: string | null;
  areaName: string | null;
  address: string | null;
  notes: string | null;
  date: DateKey;
  slotLabel: string;
  lines: RelayLine[];
  subtotalSen: Sen;
  deliverySen: Sen;
  totalSen: Sen;
  settlement: string;
  trackUrl: string;
};

function pad(left: string, right: string, width = 30): string {
  const space = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(space) + right;
}

/** The WhatsApp message a customer sends to the kitchen. Pure, so it can be snapshot-tested. */
export function renderOrderMessage(o: RelayOrder): string {
  const out: string[] = [];
  out.push("*NEW ORDER · FIELDCUT*");
  out.push(`Ref: *${o.ref}*`);
  out.push(`Verify: ${o.verifyCode}`);
  out.push(RULE);
  out.push(`Name: ${o.name}`);
  out.push(`Phone: ${displayPhone(o.phone)}`);
  if (o.mode === "delivery") {
    out.push(`Mode: Delivery · Zone ${o.zone}${o.areaName ? ` (${o.areaName})` : ""}`);
    if (o.address) out.push(`Addr: ${o.address}`);
  } else {
    out.push("Mode: Self pick-up");
  }
  out.push(`Date: ${formatDateLong(o.date)}`);
  out.push(`Slot: ${o.slotLabel}`);
  if (o.notes) out.push(`Note: ${o.notes}`);
  out.push(RULE);
  for (const l of o.lines) {
    out.push(pad(`${l.qty}× ${l.name.replace(/^The /, "")}`, formatRM(l.lineSen)));
    out.push(`   ${l.detail}`);
  }
  out.push(RULE);
  out.push(pad("Subtotal", formatRM(o.subtotalSen)));
  if (o.mode === "delivery") out.push(pad(`Delivery (Zone ${o.zone})`, formatRM(o.deliverySen)));
  out.push(`*TOTAL DUE ${formatRM(o.totalSen)}*`);
  out.push(`Settlement: ${o.settlement}`);
  out.push(RULE);
  out.push(`Track: ${o.trackUrl}`);
  out.push("_Please wait for our confirmation._");
  return out.join("\n");
}

export type RelayPlanDay = { date: DateKey; ref: string; bowlName: string; lineSen: Sen };

export type RelayPlan = Omit<RelayOrder, "lines" | "date" | "subtotalSen" | "deliverySen"> & {
  days: RelayPlanDay[];
  foodSen: Sen;
  deliverySen: Sen;
};

export function renderPlanMessage(p: RelayPlan): string {
  const out: string[] = [];
  out.push("*NEW FIVE-DAY PLAN · FIELDCUT*");
  out.push(`Plan ref: *${p.ref}*`);
  out.push(`Verify: ${p.verifyCode}`);
  out.push(RULE);
  out.push(`Name: ${p.name}`);
  out.push(`Phone: ${displayPhone(p.phone)}`);
  out.push(p.mode === "delivery" ? `Mode: Delivery · Zone ${p.zone}${p.areaName ? ` (${p.areaName})` : ""}` : "Mode: Self pick-up");
  if (p.mode === "delivery" && p.address) out.push(`Addr: ${p.address}`);
  out.push(`Slot: ${p.slotLabel} daily`);
  if (p.notes) out.push(`Note: ${p.notes}`);
  out.push(RULE);
  for (const d of p.days) out.push(pad(`${formatDateShort(d.date)}  ${d.bowlName.replace(/^The /, "")}`, formatRM(d.lineSen)));
  out.push(RULE);
  out.push(pad("Bowls", formatRM(p.foodSen)));
  if (p.mode === "delivery") out.push(pad("Delivery", formatRM(p.deliverySen)));
  out.push(`*TOTAL DUE ${formatRM(p.totalSen)}*`);
  out.push(`Settlement: ${p.settlement}`);
  out.push(RULE);
  out.push(`Track: ${p.trackUrl}`);
  out.push("_Please wait for our confirmation._");
  return out.join("\n");
}

/** Click-to-chat link that opens WhatsApp with the message ready to send. */
export function waLink(text: string, to: string = KITCHEN_WHATSAPP): string {
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export type ReplyTemplate = "confirmed" | "on_the_way" | "running_late" | "ready";

export function renderReply(t: ReplyTemplate, o: { name: string; ref: string; date: DateKey; slotLabel: string; totalSen: Sen; mode: "delivery" | "pickup" }): string {
  const first = o.name.split(" ")[0];
  switch (t) {
    case "confirmed":
      return `Hi ${first}! ✅ Order *${o.ref}* is confirmed for ${formatDateShort(o.date)}, ${o.slotLabel}. Total ${formatRM(o.totalSen)}, ${o.mode === "delivery" ? "cash to our rider" : "pay at pick-up"}. Thank you for eating early! — Fieldcut`;
    case "on_the_way":
      return `Hi ${first}, your Fieldcut bowls (${o.ref}) are on the way 🚗 Please have ${formatRM(o.totalSen)} ready. See you soon!`;
    case "running_late":
      return `Hi ${first}, so sorry — we're running about 15 minutes late with ${o.ref}. Your bowls are packed and chilled. Thank you for waiting.`;
    case "ready":
      return `Hi ${first}, order ${o.ref} is ready for pick-up 🥗 Total ${formatRM(o.totalSen)}. See you soon!`;
  }
}
