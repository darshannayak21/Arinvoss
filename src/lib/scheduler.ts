import { runCycle } from "./cycle";

// Global scheduler state — persists across requests in the dev server
let schedulerRunning = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let cycleCount = 0;

const AUTONOMOUS_INTERVAL_MINUTES = 12 * 60;

export function startScheduler(intervalMinutes: number = AUTONOMOUS_INTERVAL_MINUTES): void {
  if (schedulerRunning) {
    console.log("[Scheduler] Already running. Skipping duplicate start.");
    return;
  }

  schedulerRunning = true;
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[Scheduler] Autonomous publishing started. Cycle every ${intervalMinutes} min.`
  );

  // One immediate cycle on enable, then no more than one cycle every eight hours.
  setTimeout(async () => {
    cycleCount++;
    console.log(
      `\n[Scheduler] ── Cycle #${cycleCount} at ${new Date().toISOString()} ──`
    );
    try {
      const result = await runCycle();
      console.log("[Scheduler] Result:", JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("[Scheduler] Cycle error:", err);
    }
  }, 10_000);

  // Then repeat three times per day.
  intervalId = setInterval(async () => {
    cycleCount++;
    console.log(
      `\n[Scheduler] ── Cycle #${cycleCount} at ${new Date().toISOString()} ──`
    );
    try {
      const result = await runCycle();
      console.log("[Scheduler] Result:", JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("[Scheduler] Cycle error:", err);
    }
  }, intervalMs);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  schedulerRunning = false;
  cycleCount = 0;
  console.log("[Scheduler] Stopped.");
}

export function isSchedulerRunning(): boolean {
  return schedulerRunning;
}

export function getCycleCount(): number {
  return cycleCount;
}
