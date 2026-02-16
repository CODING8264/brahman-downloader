import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { url, format } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL required' });
    }

    const downloadDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

    const output = path.join(downloadDir, '%(title)s.%(ext)s');

    const args =
      format === 'mp3'
        ? ['-x', '--audio-format', 'mp3', '-o', output, url]
        : ['-f', 'best', '-o', output, url];

    spawn('yt-dlp', args);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Download failed'
    });
  }
}