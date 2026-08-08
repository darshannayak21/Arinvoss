import zlib from "zlib";

export interface WebhookPublishPayload {
  id?: string;
  supabaseId?: string;
  text: string;
  imageUrl?: string;
  mermaidDiagram?: string;
}

export const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/6nb068081upxmtk97qa6fnqqbqllmrgx";

/**
 * Strips all markdown asterisks, stars, and weird symbols completely
 * ensuring clean, readable plain text.
 */
export function cleanPlainText(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove **bold**
    .replace(/\*([^*]+)\*/g, "$1")   // Remove *italic*
    .replace(/\*{1,3}/g, "")         // Remove any stray asterisks
    .replace(/📌\s*/g, "")           // Remove pin emoji
    .replace(/🔗\s*/g, "Source: ")  // Format link cleanly
    .trim();
}

/**
 * Encodes a raw Mermaid.js chart into a direct, high-resolution PNG image URL via Kroki.
 */
export function mermaidToPngUrl(mermaidCode: string): string {
  try {
    if (!mermaidCode || !mermaidCode.trim()) return "";
    const cleanChart = mermaidCode.replace(/```(?:mermaid)?/g, "").trim();
    const compressed = zlib.deflateSync(cleanChart);
    const encoded = compressed.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
    return `https://kroki.io/mermaid/png/${encoded}`;
  } catch (err) {
    console.error("[Mermaid to PNG] Encoding error:", err);
    return "";
  }
}

/**
 * Dispatch published technical content to Make.com webhook for automatic LinkedIn publication.
 */
export async function dispatchToMakeWebhook(payload: WebhookPublishPayload): Promise<{ success: boolean; responseText?: string; error?: string }> {
  try {
    const formattedText = cleanPlainText(payload.text);

    // If a mermaid diagram is provided and no custom image URL is given, convert diagram to PNG
    const finalImageUrl =
      payload.imageUrl ||
      (payload.mermaidDiagram ? mermaidToPngUrl(payload.mermaidDiagram) : "");

    const supabaseId = payload.supabaseId || payload.id || "";

    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: formattedText,
        imageUrl: finalImageUrl || "",
        supabase_id: supabaseId,
      }),
    });

    const responseText = await res.text();
    console.log(`[Make.com Webhook] Status: ${res.status}, Response: ${responseText}, Image: ${finalImageUrl}`);
    return {
      success: res.ok,
      responseText,
    };
  } catch (err) {
    console.error("[Make.com Webhook] Dispatch error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
