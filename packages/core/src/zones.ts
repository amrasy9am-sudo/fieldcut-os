import type { Sen } from "./money.ts";

export type ZoneCode = "A" | "B" | "C";

export type Zone = { code: ZoneCode; label: string; maxKm: number; feeSen: Sen; planFeeSen: Sen };

export const ZONES: Record<ZoneCode, Zone> = {
  A: { code: "A", label: "0–3 km", maxKm: 3, feeSen: 300, planFeeSen: 0 },
  B: { code: "B", label: "3–6 km", maxKm: 6, feeSen: 500, planFeeSen: 0 },
  C: { code: "C", label: "6–8 km", maxKm: 8, feeSen: 700, planFeeSen: 200 },
};

export type Area = { id: string; name: string; zone: ZoneCode | null };

/**
 * Delivery areas with their zone, measured from the kitchen in Seri Manjung.
 * Zones are estimates and can be edited here; null means outside the 8 km radius (pick-up only).
 */
export const AREAS: Area[] = [
  { id: "seri-manjung", name: "Seri Manjung", zone: "A" },
  { id: "manjung-point", name: "Manjung Point", zone: "A" },
  { id: "sitiawan", name: "Sitiawan", zone: "B" },
  { id: "kampung-koh", name: "Kampung Koh", zone: "B" },
  { id: "lumut", name: "Lumut", zone: "C" },
  { id: "outside", name: "Other area (outside 8 km)", zone: null },
];

export const MIN_DELIVERY_SUBTOTAL_SEN: Sen = 2500;

export function getArea(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

/** Straight-line distance × 1.3 road factor, for when a map pin is available. */
export function zoneForDistanceKm(straightKm: number): ZoneCode | null {
  const road = straightKm * 1.3;
  if (road <= ZONES.A.maxKm) return "A";
  if (road <= ZONES.B.maxKm) return "B";
  if (road <= ZONES.C.maxKm) return "C";
  return null;
}
