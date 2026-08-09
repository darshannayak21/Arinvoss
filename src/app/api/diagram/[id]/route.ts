import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { mermaidToPngUrl } from "@/lib/publishWebhook";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const params = await context.params;
    const id = params.id.replace(/\.png$/, "");
    const client = getSupabase();
    
    if (!client) {
      return new NextResponse("Supabase not configured", { status: 500 });
    }
    
    const { data, error } = await client
      .from("posts")
      .select("mermaid_diagram")
      .eq("id", id)
      .single();
      
    if (error || !data?.mermaid_diagram) {
      return new NextResponse("Not Found", { status: 404 });
    }
    
    const krokiUrl = mermaidToPngUrl(data.mermaid_diagram);
    const res = await fetch(krokiUrl);
    
    if (!res.ok) {
      return new NextResponse("Error fetching diagram from Kroki", { status: 500 });
    }
    
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (err) {
    console.error("[Diagram API] Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
