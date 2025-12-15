// services/pedometerService.ts
import { Pedometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import statsService from "./statsService";
import { authService } from "./AuthService";

const STRIDE_M = 0.78; // average stride length in meters
const SYNC_STEP_THRESHOLD = 25;
const SYNC_INTERVAL_MS = 60_000;

interface PedometerHook {
  steps: number;          // session-relative steps
  totalToday: number;     // steps since midnight
  isAvailable: boolean;
  resetBaseline: () => void;
}

export function usePedometer(): PedometerHook {
  const [isAvailable, setIsAvailable] = useState(false);
  const [steps, setSteps] = useState(0);
  const [totalToday, setTotalToday] = useState(0);

  const baselineRef = useRef(0);
  const lastReadingRef = useRef(0);
  const pendingStepsRef = useRef(0);
  const lastSyncRef = useRef(0);
  const currentDayRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    const clearSyncTimeout = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };

    const flushPending = async (force = false) => {
      if (cancelled) return;

      const hasToken = !!authService.getToken();

      if (!hasToken) {
        pendingStepsRef.current = 0;
        clearSyncTimeout();
        return;
      }

      if (!force && pendingStepsRef.current <= 0) {
        clearSyncTimeout();
        return;
      }

      const stepsDelta = pendingStepsRef.current;
      if (stepsDelta <= 0) {
        pendingStepsRef.current = 0;
        clearSyncTimeout();
        return;
      }

      const distanceDelta = stepsDelta * STRIDE_M;
      pendingStepsRef.current = 0;
      clearSyncTimeout();

      try {
        await statsService.syncStats({
          steps: Math.round(stepsDelta),
          distance: Math.round(distanceDelta * 100) / 100,
        });
        lastSyncRef.current = Date.now();
      } catch (err) {
        if (!(err instanceof Error && err.message === "Not authenticated")) {
          console.log("stats sync failed:", err);
          pendingStepsRef.current += stepsDelta;
          scheduleSync();
        } else {
          pendingStepsRef.current = 0;
        }
      }
    };

    const scheduleSync = () => {
      if (syncTimeoutRef.current || cancelled) return;
      if (!authService.getToken()) return;
      syncTimeoutRef.current = setTimeout(() => {
        flushPending().catch((err) => console.log("delayed stats sync failed:", err));
      }, SYNC_INTERVAL_MS);
    };

    const init = async () => {
      let permissionsGranted = false;

      try {
        if (typeof Pedometer.getPermissionsAsync === "function") {
          const { status } = await Pedometer.getPermissionsAsync();
          if (status === "granted") {
            permissionsGranted = true;
          }
        }

        if (!permissionsGranted && typeof Pedometer.requestPermissionsAsync === "function") {
          const { status } = await Pedometer.requestPermissionsAsync();
          permissionsGranted = status === "granted";
        }
      } catch (err) {
        console.log("Pedometer permission check failed:", err);
      }

      if (!permissionsGranted) {
        setIsAvailable(false);
        return;
      }

      const avail = await Pedometer.isAvailableAsync();
      if (cancelled) return;
      setIsAvailable(avail);

      if (!avail) return;

      // get today’s steps from midnight
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentDayRef.current = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      try {
        const result = await Pedometer.getStepCountAsync(startOfDay, now);
        if (!cancelled) setTotalToday(result.steps || 0);
      } catch (e) {
        console.log("getStepCountAsync error:", e);
      }

      // live updates
      subscription = Pedometer.watchStepCount((reading) => {
        if (baselineRef.current === 0) {
          baselineRef.current = reading.steps;
        }

        const now = new Date();
        const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        if (currentDayRef.current && currentDayRef.current !== dayKey) {
          flushPending(true).catch((err) => console.log("midnight stats sync failed:", err));
          currentDayRef.current = dayKey;
          pendingStepsRef.current = 0;
          baselineRef.current = reading.steps;
          lastReadingRef.current = reading.steps;
          setSteps(0);
          setTotalToday(0);
          return;
        }

        currentDayRef.current = dayKey;
        const previous = lastReadingRef.current;
        lastReadingRef.current = reading.steps;
        setSteps(reading.steps - baselineRef.current);

        if (previous > 0) {
          const delta = reading.steps - previous;
          if (!Number.isNaN(delta) && delta > 0) {
            setTotalToday((prev) => prev + delta);
            pendingStepsRef.current += delta;

            const timeSinceLastSync = Date.now() - lastSyncRef.current;
            if (
              pendingStepsRef.current >= SYNC_STEP_THRESHOLD ||
              timeSinceLastSync >= SYNC_INTERVAL_MS
            ) {
              flushPending().catch((err) => console.log("stats sync failed:", err));
            } else {
              scheduleSync();
            }
          }
        }
      });
    };

    init();

    return () => {
      cancelled = true;
      subscription && subscription.remove();
      clearSyncTimeout();
      flushPending(true).catch((err) => console.log("cleanup stats sync failed:", err));
    };
  }, []);

  const resetBaseline = () => {
    baselineRef.current = lastReadingRef.current;
    setSteps(0);
  };

  return { steps, totalToday, isAvailable, resetBaseline };
}
