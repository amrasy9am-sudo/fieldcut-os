import "server-only";
import { getArea, renderOrderMessage, renderPlanMessage, waLink } from "@fieldcut/core";
import { getPlanOrders, SETTLEMENT_LABELS, type OrderView } from "./repo";

/** Builds the WhatsApp text for an order (or a whole five-day plan) from what is stored. */
export function messageFor(order: OrderView, base: string): string {
  const trackUrl = `${base}/t/${order.planRef ?? order.ref}`;
  const common = {
    verifyCode: order.verifyCode,
    name: order.name,
    phone: order.phone,
    mode: order.mode,
    zone: order.zone,
    areaName: order.areaId ? (getArea(order.areaId)?.name ?? null) : null,
    address: order.address,
    notes: order.notes,
    slotLabel: order.slotLabel,
    settlement: SETTLEMENT_LABELS[order.settlementMethod],
    trackUrl,
  };
  if (order.planRef) {
    const days = getPlanOrders(order.planRef);
    const foodSen = days.reduce((s, o) => s + o.subtotalSen, 0);
    const deliverySen = days.reduce((s, o) => s + o.deliverySen, 0);
    return renderPlanMessage({
      ...common,
      ref: order.planRef,
      days: days.map((o) => ({ date: o.date, ref: o.ref, bowlName: o.items[0]?.name ?? "", lineSen: o.subtotalSen })),
      foodSen,
      deliverySen,
      totalSen: foodSen + deliverySen,
    });
  }
  return renderOrderMessage({
    ...common,
    ref: order.ref,
    date: order.date,
    lines: order.items.map((i) => ({ qty: i.qty, name: i.name, detail: i.detail, lineSen: i.lineSen })),
    subtotalSen: order.subtotalSen,
    deliverySen: order.deliverySen,
    totalSen: order.totalSen,
  });
}

export function relayLinkFor(order: OrderView, base: string): string {
  return waLink(messageFor(order, base));
}
