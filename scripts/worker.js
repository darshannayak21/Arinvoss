/**
 * Standalone Autonomous Cron Worker for Render Background Worker
 * Automatically schedules and invokes Curation (8:00 AM UTC) & Dispatch (11:00 AM & 6:00 PM UTC).
 */

const BASE_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || "http://localhost:3000";

console.log(`[Worker] Starting Autonomous Background Worker pointing to ${BASE_URL}...`);

async function callCron(endpoint) {
  try {
    const url = `${BASE_URL}/api/cron/${endpoint}`;
    console.log(`[Worker] Triggering ${url} at ${new Date().toISOString()}...`);
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    console.log(`[Worker] Response from ${endpoint}:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[Worker] Failed calling ${endpoint}:`, err);
  }
}

// Track last run hour to prevent duplicate runs
let lastCurationHour = -1;
let lastDispatchHour = -1;

function checkAndRunSchedules() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  // 1. Curation Cron: 8:00 AM UTC (within 08:00 - 08:15 window)
  if (utcHours === 8 && lastCurationHour !== 8) {
    console.log("[Worker] 8:00 AM UTC Detected -> Running Curation Pipeline...");
    lastCurationHour = 8;
    callCron("curate");
  } else if (utcHours !== 8) {
    lastCurationHour = -1;
  }

  // 2. Dispatch Cron: 11:00 AM & 6:00 PM UTC (11:00 & 18:00)
  if ((utcHours === 11 || utcHours === 18) && lastDispatchHour !== utcHours) {
    console.log(`[Worker] ${utcHours}:00 UTC Detected -> Running Dispatch Pipeline...`);
    lastDispatchHour = utcHours;
    callCron("dispatch");
  } else if (utcHours !== 11 && utcHours !== 18) {
    lastDispatchHour = -1;
  }
}

// Check every 60 seconds
setInterval(checkAndRunSchedules, 60 * 1000);
checkAndRunSchedules();

console.log("[Worker] Schedulers active: Curation @ 08:00 UTC | Dispatch @ 11:00 & 18:00 UTC");
