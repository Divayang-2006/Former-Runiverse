import { useEffect, useState } from "react";

/**
 * Returns a debounced value that only updates after `delay` ms of inactivity.
 * Cleans up timers on unmount or when the value changes.
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

