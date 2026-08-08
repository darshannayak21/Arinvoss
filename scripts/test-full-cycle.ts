import fs from "fs";

// Load .env.local manually
try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      process.env[key.trim()] = vals.join("=").trim();
    }
  }
} catch (e) {
  console.warn("Could not load .env.local", e);
}

import { createAgent } from "../src/lib/store";
import { runCycle } from "../src/lib/cycle";

async function main() {
  const agentId = createAgent("Aris Voss", "AI Research Engineering");
  console.log("Agent initialized:", agentId);

  console.log("Starting full autonomous cycle with Deep README, Critic, and Diagrams...");
  const result = await runCycle();
  console.log("\n==================== CYCLE RESULT ====================");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
