import { useEffect, useRef, useState } from "react";

// Poll schedule: 1s, 5s, then 10s×10, then 20s×20, then 5min forever
const SCHEDULE = [1_000, 5_000, ...Array(10).fill(10_000), ...Array(20).fill(20_000)];
const FLOOR = 5 * 60 * 1_000;

/**
 * Returns a refetchInterval (ms) that backs off progressively while `active` is true.
 * Resets the attempt counter whenever active flips false→true.
 * Pass the returned value directly to TanStack Query's `refetchInterval`.
 */
export function useBackoffInterval(active: boolean): number | false {
  const attempt = useRef(0);
  const wasActive = useRef(false);
  const [interval, setInterval] = useState<number | false>(false);

  useEffect(() => {
    if (!active) {
      attempt.current = 0;
      wasActive.current = false;
      setInterval(false);
      return;
    }

    if (!wasActive.current) {
      // fresh start
      attempt.current = 0;
      wasActive.current = true;
    }

    const next = SCHEDULE[attempt.current] ?? FLOOR;
    attempt.current += 1;
    setInterval(next);
  }, [active]);

  return interval;
}
