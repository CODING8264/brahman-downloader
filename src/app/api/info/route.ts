import { NextRequest, NextResponse } from "next/server";
import { getVideoInfo } from "@/lib/ytdlp";

/**
 * Prevent Next.js from caching this route
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    // 1️⃣ URL required
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // 2️⃣ Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 3️⃣ Fetch info using yt-dlp
    const info = await getVideoInfo(url);

    // 4️⃣ Safe formats parsing (VERY IMPORTANT)
    const formats = (info.formats || []).map((f) => ({
      id: f.format_id,
      label: `${f.quality}${f.resolution ? ` (${f.resolution})` : ""}`,
      quality: f.quality,
      type: f.vcodec !== "none" ? ("video" as const) : ("audio" as const),
    }));

    // 5️⃣ Return clean response
    return NextResponse.json({
      success: true,
      data: {
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
        description: info.description,
        platform: info.platform,
        formats,
      },
    });
  } catch (error) {
    console.error("Error fetching video info:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch video info";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}