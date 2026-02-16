import { spawn } from "child_process";

const YTDLP_BINARY = "yt-dlp";

/**
 * Run yt-dlp safely and return parsed JSON
 */
function runYtDlp(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const process = spawn(YTDLP_BINARY, args);

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(stderr || "yt-dlp failed")
        );
      }

      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch {
        reject(new Error("Failed to parse yt-dlp output"));
      }
    });

    process.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Fetch video metadata only
 */
export async function getVideoInfo(url: string) {
  return runYtDlp([
    "--dump-json",
    "--no-playlist",
    url,
  ]);
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): string {
  const u = url.toLowerCase();

  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("instagram.com")) return "Instagram";
  if (u.includes("tiktok.com")) return "TikTok";
  if (u.includes("twitter.com") || u.includes("x.com")) return "Twitter/X";
  if (u.includes("spotify.com")) return "Spotify";
  if (u.includes("vimeo.com")) return "Vimeo";

  return "Other";
}