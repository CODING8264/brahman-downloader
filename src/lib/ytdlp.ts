import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  description?: string;
  formats: FormatInfo[];
  platform: string;
}

export interface FormatInfo {
  format_id: string;
  ext: string;
  quality: string;
  resolution?: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
}

export interface DownloadOptions {
  url: string;
  format: string;
  quality: string;
  customName?: string;
  outputPath?: string;
}

export interface DownloadProgress {
  percent: number;
  speed: string;
  eta: string;
  status: string;
}

// Detect platform from URL
export function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('instagram.com')) return 'instagram';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch')) return 'facebook';
  if (urlLower.includes('spotify.com')) return 'spotify';
  if (urlLower.includes('soundcloud.com')) return 'soundcloud';
  if (urlLower.includes('vimeo.com')) return 'vimeo';
  if (urlLower.includes('dailymotion.com')) return 'dailymotion';
  if (urlLower.includes('twitch.tv')) return 'twitch';
  if (urlLower.includes('reddit.com')) return 'reddit';
  if (urlLower.includes('pinterest.com')) return 'pinterest';
  if (urlLower.includes('snapchat.com')) return 'snapchat';
  return 'unknown';
}

// Get video information
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  try {
    const { stdout, stderr } = await execAsync(
      `yt-dlp --dump-json --no-warnings "${url}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
    
    const info = JSON.parse(stdout);
    const platform = detectPlatform(url);
    
    const formats: FormatInfo[] = (info.formats || [])
      .filter((f: { format_id?: string; ext?: string; protocol?: string }) => f.format_id && f.ext && f.protocol !== 'http_dash_segments')
      .map((f: { 
        format_id: string; 
        ext: string; 
        format_note?: string; 
        width?: number; 
        height?: number; 
        filesize?: number;
        vcodec?: string;
        acodec?: string;
      }) => ({
        format_id: f.format_id,
        ext: f.ext,
        quality: f.format_note || 'unknown',
        resolution: f.width && f.height ? `${f.width}x${f.height}` : undefined,
        filesize: f.filesize,
        vcodec: f.vcodec,
        acodec: f.acodec
      }))
      .slice(0, 20);

    return {
      title: info.title || 'Unknown Title',
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
      duration: info.duration || 0,
      uploader: info.uploader || info.channel || 'Unknown',
      description: info.description?.slice(0, 500),
      formats,
      platform
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get video info: ${errorMessage}`);
  }
}

// Download video/audio
export async function downloadMedia(
  options: DownloadOptions,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ filePath: string; fileName: string }> {
  const { url, format, quality, customName, outputPath } = options;
  
  const downloadDir = outputPath || path.join(process.cwd(), 'download');
  if (!existsSync(downloadDir)) {
    await mkdir(downloadDir, { recursive: true });
  }

  let formatArg: string;
  
  if (format === 'mp3' || format === 'audio') {
    formatArg = 'bestaudio/best';
  } else if (quality === 'best' || quality === 'highest') {
    formatArg = 'bestvideo+bestaudio/best';
  } else if (quality.includes('p')) {
    formatArg = `bestvideo[height<=${quality.replace('p', '')}]+bestaudio/best[height<=${quality.replace('p', '')}]`;
  } else {
    formatArg = 'bestvideo+bestaudio/best';
  }

  const outputTemplate = customName 
    ? path.join(downloadDir, `${customName}.%(ext)s`)
    : path.join(downloadDir, '%(title)s.%(ext)s');

  return new Promise((resolve, reject) => {
    const args = [
      '--no-warnings',
      '--newline',
      '--progress',
      '--progress-template', '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
      '-f', formatArg,
      '-o', outputTemplate,
    ];

    if (format === 'mp3' || format === 'audio') {
      args.push('-x');
      args.push('--audio-format', 'mp3');
      args.push('--audio-quality', '0');
    } else if (format === 'mp4') {
      args.push('--merge-output-format', 'mp4');
    }

    args.push(url);

    const proc = spawn('yt-dlp', args);
    let lastLine = '';
    let filePath = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      lastLine = output.split('\n').filter(Boolean).pop() || lastLine;
      
      if (lastLine.includes('%') && onProgress) {
        const parts = lastLine.split('|');
        if (parts.length >= 3) {
          const percent = parseFloat(parts[0].replace('%', '').trim()) || 0;
          onProgress({
            percent: Math.min(100, Math.max(0, percent)),
            speed: parts[1].trim(),
            eta: parts[2].trim(),
            status: 'downloading'
          });
        }
      }
      
      if (output.includes('[Merger]') || output.includes('[download] Destination:')) {
        const match = output.match(/Destination:\s*(.+)/);
        if (match) filePath = match[1].trim();
      }
      if (output.includes('[ExtractAudio] Destination:')) {
        const match = output.match(/Destination:\s*(.+)/);
        if (match) filePath = match[1].trim();
      }
    });

    proc.stderr.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;
      
      if (output.includes('[download]')) {
        const match = output.match(/Destination:\s*(.+)/);
        if (match) filePath = match[1].trim();
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        const fileName = filePath ? path.basename(filePath) : (customName || 'download') + '.' + (format === 'mp3' ? 'mp3' : 'mp4');
        resolve({ filePath: filePath || path.join(downloadDir, fileName), fileName });
      } else {
        let errorMsg = `Download failed with code ${code}`;
        if (errorOutput.includes('Sign in to confirm')) {
          errorMsg = 'YouTube requires authentication. Try a different video or platform.';
        } else if (errorOutput.includes('Video unavailable')) {
          errorMsg = 'Video is unavailable or private';
        } else if (errorOutput.includes('HTTP Error')) {
          errorMsg = 'Network error. Please try again.';
        }
        reject(new Error(errorMsg));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Download error: ${err.message}`));
    });
  });
}

// Get suggested filename from metadata
export function generateFilename(info: VideoInfo, format: string): string {
  const sanitizedName = info.title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  
  const ext = format === 'mp3' || format === 'audio' ? 'mp3' : format;
  return `${sanitizedName}.${ext}`;
}
