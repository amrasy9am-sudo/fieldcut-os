"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Live "closes in 3h 12m" text. Time is only read in the browser, after hydration. */
export function Countdown({ until, prefix }: { until: string; prefix: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Date.parse(until) - Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [until]);
  const urgent = left !== null && left < 3600_000;
  return (
    <span className={urgent ? "text-radish" : undefined}>
      {prefix} {left === null ? "at 10 pm" : left <= 0 ? "now — refresh" : `in ${format(left)}`}
    </span>
  );
}
