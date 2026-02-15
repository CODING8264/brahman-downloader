import { NextRequest, NextResponse } from 'next/server';
import { downloadMedia, getVideoInfo, detectPlatform } from '@/lib/ytdlp';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, format = 'mp4', quality = 'best', customName } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const platform = detectPlatform(url);
    
    const download = await db.download.create({
      data: {
        url,
        platform,
        format,
        quality,
        customName: customName || null,
        status: 'pending',
        progress: 0
      }
    });

    // Start download in background
    (async () => {
      let info = null;
      try {
        try {
          info = await getVideoInfo(url);
          await db.download.update({
            where: { id: download.id },
            data: {
              title: info.title,
              thumbnail: info.thumbnail,
              duration: formatDuration(info.duration)
            }
          });
        } catch (infoError) {
          console.log('Could not fetch video info, continuing with download:', infoError);
        }

        await db.download.update({
          where: { id: download.id },
          data: { status: 'downloading' }
        });

        const result = await downloadMedia(
          {
            url,
            format,
            quality,
            customName: customName || (info?.title ? sanitizeFilename(info.title) : undefined)
          },
          async (progress) => {
            try {
              await db.download.update({
                where: { id: download.id },
                data: { progress: Math.round(progress.percent) }
              });
            } catch {
              // Ignore progress update errors
            }
          }
        );

        const fs = await import('fs/promises');
        let fileSize = 'Unknown';
        try {
          const stats = await fs.stat(result.filePath);
          fileSize = formatFileSize(stats.size);
        } catch {
          // Ignore
        }

        await db.download.update({
          where: { id: download.id },
          data: {
            status: 'completed',
            progress: 100,
            filePath: result.filePath,
            fileSize,
            title: info?.title || result.fileName.replace(/\.[^/.]+$/, '')
          }
        });
      } catch (error) {
        console.error('Download error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Download failed';
        await db.download.update({
          where: { id: download.id },
          data: {
            status: 'failed',
            error: errorMessage
          }
        });
      }
    })();

    return NextResponse.json({
      success: true,
      data: { id: download.id, platform }
    });
  } catch (error) {
    console.error('Error starting download:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start download' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      const downloads = await db.download.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      return NextResponse.json({ success: true, data: downloads });
    }

    const download = await db.download.findUnique({
      where: { id }
    });

    if (!download) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: download });
  } catch (error) {
    console.error('Error fetching downloads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch downloads' },
      { status: 500 }
    );
  }
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
      }
