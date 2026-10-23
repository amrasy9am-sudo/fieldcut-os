export type SlotDef = { id: number; label: string; start: string; end: string; defaultCapacity: number; active: boolean };

/** Default delivery slots. Capacity is in bowls; the console can change both. */
export const DEFAULT_SLOTS: SlotDef[] = [
  { id: 1, label: "11:00–12:00", start: "11:00", end: "12:00", defaultCapacity: 10, active: true },
  { id: 2, label: "12:00–13:00", start: "12:00", end: "13:00", defaultCapacity: 15, active: true },
  { id: 3, label: "13:00–14:00", start: "13:00", end: "14:00", defaultCapacity: 10, active: true },
  { id: 4, label: "17:30–18:30", start: "17:30", end: "18:30", defaultCapacity: 20, active: false },
];

export type SlotUsage = { capacity: number; held: number; confirmed: number };

export type SlotAvailability = SlotUsage & {
  slotId: number;
  label: string;
  left: number;
  state: "open" | "low" | "full";
};

export function availability(slot: Pick<SlotDef, "id" | "label">, usage: SlotUsage): SlotAvailability {
  const left = Math.max(0, usage.capacity - usage.held - usage.confirmed);
  const state = left === 0 ? "full" : left <= Math.max(2, Math.ceil(usage.capacity * 0.3)) ? "low" : "open";
  return { slotId: slot.id, label: slot.label, ...usage, left, state };
}

/** The capacity rule: a reservation fits only if it doesn't push the slot past capacity. */
export function canReserve(usage: SlotUsage, bowls: number): boolean {
  return bowls > 0 && usage.held + usage.confirmed + bowls <= usage.capacity;
}
