import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_FFMPEG_RUNTIME_MS = 30_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4"]);

export async function createMediaPreview(input, declaredMimeType, ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg") {
  if (!Buffer.isBuffer(input) || input.length === 0 || input.length > MAX_UPLOAD_BYTES) {
    throw new Error("Upload is empty or exceeds the 50 MB processing limit.");
  }

  if (!ALLOWED_MIME_TYPES.has(declaredMimeType)) {
    throw new Error("Upload has an unsupported declared media type.");
  }

  const detectedType = await fileTypeFromBuffer(input);
  if (!detectedType || detectedType.mime !== declaredMimeType) {
    throw new Error("Upload contents do not match the declared media type.");
  }

  if (declaredMimeType.startsWith("image/")) {
    return createImagePreview(input);
  }

  return createVideoPreview(input, ffmpegPath);
}

async function createImagePreview(input) {
  try {
    return await sharp(input, {
      failOn: "warning",
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
      .rotate()
      .resize({
        width: 1080,
        height: 1080,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    throw new Error(`Image decode failed: ${error instanceof Error ? error.message : "unknown image error"}`);
  }
}

async function createVideoPreview(input, ffmpegPath) {
  const directory = await mkdtemp(join(tmpdir(), "bellacures-media-"));
  const inputPath = join(directory, "source.mp4");
  const outputPath = join(directory, "preview.jpg");

  try {
    await writeFile(inputPath, input, { flag: "wx", mode: 0o600 });
    await runFfmpeg(ffmpegPath, inputPath, outputPath);
    const frame = await readFile(outputPath);
    return await createImagePreview(frame);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function runFfmpeg(ffmpegPath, inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-y",
      "-max_alloc", "67108864",
      "-threads", "1",
      "-i", inputPath,
      "-map", "0:v:0",
      "-frames:v", "1",
      "-vf", "scale=w='min(1080,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease",
      "-q:v", "3",
      "-f", "image2",
      outputPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("Video preview extraction exceeded the 30-second limit."));
    }, MAX_FFMPEG_RUNTIME_MS);

    child.stderr.on("data", (chunk) => {
      if (stderr.length < 8192) stderr += chunk.toString().slice(0, 8192 - stderr.length);
    });
    child.once("error", (error) => finish(new Error(`Could not start ffmpeg: ${error.message}`)));
    child.once("close", (code) => {
      if (code === 0) finish();
      else finish(new Error(`Video decode failed${stderr.trim() ? `: ${stderr.trim()}` : "."}`));
    });

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    }
  });
}
