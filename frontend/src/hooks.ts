import { useEffect, useRef, useState } from "react";

/** Counts down from `seconds` while `running` is true and calls `onExpire` once at zero. */
export function useCountdown(seconds: number, running: boolean, onExpire: () => void) {
  const [left, setLeft] = useState(seconds);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => setLeft(seconds), [seconds]);

  useEffect(() => {
    if (!running) return;
    const end = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, (end - Date.now()) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        expire.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  return { left, reset: () => setLeft(seconds) };
}
