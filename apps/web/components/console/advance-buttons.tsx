import { EVENT_LABELS, nextEvents, type Status } from "@fieldcut/core";
import { advanceOrderAction } from "@/actions/console";
import { buttonStyles, cx } from "../ui";

/** One button per legal next step for an order (confirm is done from the order page with the verify code). */
export function AdvanceButtons({ orderRef, status, mode, compact = false }: { orderRef: string; status: Status; mode: "delivery" | "pickup"; compact?: boolean }) {
  const events = nextEvents(status, mode).filter((e) => e !== "confirm" && (!compact || e !== "cancel"));
  if (!events.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {events.map((e) => (
        <form key={e} action={advanceOrderAction}>
          <input type="hidden" name="ref" value={orderRef} />
          <input type="hidden" name="event" value={e} />
          {e === "complete" && <input type="hidden" name="settle" value="1" />}
          <button className={cx(buttonStyles.small,
            e === "cancel" || e === "no_show" ? "border border-line bg-white text-radish" : "bg-loam text-white")}>
            {e === "complete" ? "Delivered & settled" : EVENT_LABELS[e]}
          </button>
        </form>
      ))}
    </div>
  );
}
