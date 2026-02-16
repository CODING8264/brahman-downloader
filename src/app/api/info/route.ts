import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo, detectPlatform } from '@/lib/ytdlp';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL required' });
    }

    const info = await getVideoInfo(url);

    return NextResponse.json({
      success: true,
      data: {
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
        platform: detectPlatform(url)
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch info'
    });
  }
}