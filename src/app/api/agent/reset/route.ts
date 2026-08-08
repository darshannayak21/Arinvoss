import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST() {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(path.join(dataDir, "posts.json"), "[]", "utf-8");
    fs.writeFileSync(path.join(dataDir, "rejected.json"), "[]", "utf-8");
    fs.writeFileSync(path.join(dataDir, "seen.json"), "{}", "utf-8");
    fs.writeFileSync(path.join(dataDir, "backlog.json"), "[]", "utf-8");

    return NextResponse.json({ success: true, message: "All posts, rejections, seen URLs, and backlog cleared." });
  } catch (err) {
    console.error("[Reset API] Error:", err);
    return NextResponse.json({ error: "Failed to reset data" }, { status: 500 });
  }
}
