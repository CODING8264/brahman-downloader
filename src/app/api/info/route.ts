import { NextRequest, NextResponse } from "next/server";
import { getVideoInfo, detectPlatform } from "@/lib/ytdlp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    // 1️⃣ Validate URL
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 2️⃣ Get info from yt-dlp
    const info = await getVideoInfo(url);

    if (!info) {
      return NextResponse.json(
        { error: "Failed to fetch video info" },
        { status: 500 }
      );
    }

    // 3️⃣ Detect platform safely
    const platform = detectPlatform(url) || info.extractor || "unknown";

    // 4️⃣ Safe formats handling
    const formats = Array.isArray(info.formats)
      ? info.formats.map((f: any) => ({
          id: f.format_id,
          label: `${f.format_note || f.ext || "unknown"}${
            f.resolution ? ` (${f.resolution})` : ""
          }`,
          quality: f.format_note || f.quality || "unknown",
          type: f.vcodec && f.vcodec !== "none" ? "video" : "audio",
        }))
      : [];

    return NextResponse.json({
      success: true,
      data: {
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
        description: info.description,
        platform,
        formats,
      },
    });

  } catch (error) {
    console.error("Error fetching video info:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch video info";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}