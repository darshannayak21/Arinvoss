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
 * Encodes a raw Mermaid.js chart into a direct, high-resolution PNG image URL via official Mermaid Ink.
 */
export function mermaidToPngUrl(mermaidCode: string): string {
  try {
    if (!mermaidCode || !mermaidCode.trim()) return "";
    const cleanChart = mermaidCode.replace(/```(?:mermaid)?/g, "").trim();
    
    // Mermaid Ink requires base64 of a JSON string with the code and theme
    const state = { 
      code: cleanChart, 
      mermaid: { theme: 'default' } 
    };
    
    const jsonStr = JSON.stringify(state);
    const b64 = Buffer.from(jsonStr).toString('base64');
    
    return `https://mermaid.ink/img/${b64}`;
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

    const supabaseId = payload.supabaseId || payload.id || "";

    // LinkedIn's image proxy crashes (500 Error) on excessively long base64 URLs.
    // We enforce short diagrams (4-7 nodes) during curation to prevent this.
    // If the diagram URL is still too long, we use a beautiful, safe AI static banner.
    let finalImageUrl = "";
    if (payload.mermaidDiagram) {
      const krokiUrl = mermaidToPngUrl(payload.mermaidDiagram);
      if (krokiUrl.length > 800) {
        // Safe static fallback to prevent LinkedIn DataError 500
        finalImageUrl = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1200&auto=format&fit=crop";
      } else {
        finalImageUrl = krokiUrl;
      }
    } else {
      finalImageUrl = payload.imageUrl || "";
    }

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
