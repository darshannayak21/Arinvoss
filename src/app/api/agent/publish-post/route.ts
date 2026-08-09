import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { dispatchToMakeWebhook, mermaidToPngUrl } from "@/lib/publishWebhook";
import { updatePostLinkedInStatus } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const client = getSupabase();
    if (!client) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { data: post, error } = await client
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let directImageUrl = post.image_url;
    if (!directImageUrl || !directImageUrl.startsWith("http")) {
      if (post.mermaid_diagram && post.mermaid_diagram.length > 10) {
        directImageUrl = mermaidToPngUrl(post.mermaid_diagram);
      } else {
        directImageUrl = "";
      }
    }

    console.log(`[API Publish] Manually dispatching post ${postId} to Make.com...`);
    
    const webhookRes = await dispatchToMakeWebhook({
      id: post.id,
      supabaseId: post.id,
      text: post.text,
      imageUrl: directImageUrl,
      mermaidDiagram: post.mermaid_diagram,
    });

    if (!webhookRes.success) {
      return NextResponse.json({ error: webhookRes.error || "Webhook failed" }, { status: 500 });
    }

    await updatePostLinkedInStatus(post.id, true, webhookRes.responseText);

    return NextResponse.json({ success: true, postId });
  } catch (err) {
    console.error("[API Publish] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
