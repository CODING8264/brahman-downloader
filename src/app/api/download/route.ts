import { NextRequest, NextResponse } from "next/server";
import { downloadMedia } from "@/lib/ytdlp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, format } = body;

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

    // 2️⃣ Validate format
    if (!format) {
      return NextResponse.json(
        { error: "Format is required" },
        { status: 400 }
      );
    }

    // 3️⃣ Start download via yt-dlp
    const result = await downloadMedia({
      url,
      format,
    });

    // 4️⃣ Return success
    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("Download error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Download failed";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}