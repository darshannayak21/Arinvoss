import Groq from "groq-sdk";

let client: Groq;

function getGroqClient(): Groq {
  if (client) return client;
  client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  return client;
}

function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "object" && "status" in err && (err as { status: number }).status === 429) return true;
  const msg = String(err);
  return msg.includes("429") || msg.includes("rate_limit") || msg.includes("Rate limit");
}

/**
 * Call the Scout model (llama-3.1-8b-instant) with automatic rate-limit retry
 */
export async function callScout(
  systemPrompt: string,
  userPrompt: string,
  retries = 5
): Promise<string> {
  const groq = getGroqClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 350,
        response_format: { type: "json_object" },
      });
      return response.choices[0]?.message?.content || "{}";
    } catch (err: unknown) {
      if (isRateLimitError(err)) {
        if (attempt < retries) {
          const waitMs = 6000 + attempt * 2000;
          console.warn(`[Scout] Rate limit 429 hit. Waiting ${waitMs / 1000}s (Attempt ${attempt}/${retries})...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }
      throw err;
    }
  }
  return "{}";
}

/**
 * Call the Writer model (llama-3.3-70b-versatile) with automatic rate-limit retry
 */
export async function callWriter(
  systemPrompt: string,
  userPrompt: string,
  retries = 5
): Promise<string> {
  const groq = getGroqClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 900,
        response_format: { type: "json_object" },
      });
      return response.choices[0]?.message?.content || "{}";
    } catch (err: unknown) {
      if (isRateLimitError(err)) {
        if (attempt < retries) {
          const waitMs = 7000 + attempt * 2000;
          console.warn(`[Writer] Rate limit 429 hit. Waiting ${waitMs / 1000}s (Attempt ${attempt}/${retries})...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }
      throw err;
    }
  }
  return "{}";
}

/**
 * Call the dedicated architecture agent. Mermaid is returned as plain text so
 * the diagram can use native Mermaid syntax rather than a JSON wrapper.
 */
export async function callArchitect(
  systemPrompt: string,
  userPrompt: string,
  retries = 3
): Promise<string> {
  const groq = getGroqClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1800,
      });
      return response.choices[0]?.message?.content || "";
    } catch (err: unknown) {
      if (isRateLimitError(err) && attempt < retries) {
        const waitMs = 7000 + attempt * 2000;
        console.warn(`[Architect] Rate limit hit. Retrying in ${waitMs / 1000}s.`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  return "";
}
