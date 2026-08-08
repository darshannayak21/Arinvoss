async function run() {
  console.log("Initializing agent...");
  const initRes = await fetch("http://localhost:3000/api/agent/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      persona: { name: "Aris Voss", domain: "AI Research Engineering" },
    }),
  });
  console.log("Init status:", initRes.status);

  console.log("Triggering live cycle...");
  const cycleRes = await fetch("http://localhost:3000/api/agent/cycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const cycleData = await cycleRes.json();
  console.log("Cycle Result:", JSON.stringify(cycleData, null, 2));

  console.log("Fetching published feed...");
  const feedRes = await fetch("http://localhost:3000/api/agent/feed");
  const feedData = await feedRes.json();
  console.log(`Feed count: ${feedData.posts?.length}`);
  if (feedData.posts?.length > 0) {
    const latest = feedData.posts[0];
    console.log("Latest Post ID:", latest.id);
    console.log("Editorial Score:", latest.editorialScore);
    console.log("Metrics Cited:", latest.metricsCited);
    console.log("Diagram present:", Boolean(latest.mermaidDiagram));
  }
}

run().catch(console.error);
