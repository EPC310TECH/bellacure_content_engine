import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { createMediaPreview } from "./media-processing.mjs";
import { processNextJob } from "./media-worker.mjs";

test("image previews are normalized JPEGs and retries are deterministic", async () => {
  const input = await sharp({
    create: { width: 1400, height: 700, channels: 3, background: "#aa6688" },
  }).png().toBuffer();

  const firstPreview = await createMediaPreview(input, "image/png");
  const secondPreview = await createMediaPreview(input, "image/png");
  const metadata = await sharp(firstPreview).metadata();

  assert.equal(metadata.format, "jpeg");
  assert.deepEqual([metadata.width, metadata.height], [1080, 540]);
  assert.deepEqual(firstPreview, secondPreview);
});

test("rejects uploads whose bytes do not match the declared MIME type", async () => {
  const png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#ffffff" },
  }).png().toBuffer();

  await assert.rejects(
    createMediaPreview(png, "image/jpeg"),
    /do not match the declared media type/,
  );
  await assert.rejects(
    createMediaPreview(Buffer.from("not an image"), "image/png"),
    /do not match the declared media type/,
  );
});

test("extracts a still preview from an MP4 without changing the source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bellacures-test-"));
  const inputPath = join(directory, "source.mp4");
  try {
    const result = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=purple:s=64x48:d=0.25",
      "-frames:v", "1", "-pix_fmt", "yuv420p", inputPath,
    ], { encoding: "utf8" });
    if (result.error?.code === "ENOENT") {
      test.skip("ffmpeg is required to run video preview tests");
      return;
    }
    assert.equal(result.status, 0, result.stderr);

    const original = await readFile(inputPath);
    const preview = await createMediaPreview(original, "video/mp4");
    const metadata = await sharp(preview).metadata();
    assert.equal(metadata.format, "jpeg");
    assert.ok(metadata.width <= 1080 && metadata.height <= 1080);
    assert.deepEqual(await readFile(inputPath), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("records a validation failure and does not upload a preview", async () => {
  const job = {
    job_id: "job-1",
    location_id: "location-1",
    uploaded_by: "user-1",
    object_path: "location-1/user-1/source.png",
    declared_mime_type: "image/png",
    size_bytes: Buffer.byteLength("bad bytes"),
    attempt_count: 1,
    worker_lease: "lease-1",
  };
  const rpcCalls = [];
  let uploads = 0;
  const supabase = {
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      if (name === "claim_next_media_job") return { data: [job], error: null };
      return { data: true, error: null };
    },
    storage: {
      from: () => ({
        download: async () => ({ data: new Blob(["bad bytes"]), error: null }),
        upload: async () => { uploads += 1; return { error: null }; },
      }),
    },
  };

  assert.equal(await processNextJob(supabase), true);
  assert.equal(uploads, 0);
  assert.equal(rpcCalls[1].name, "finish_media_job");
  assert.equal(rpcCalls[1].args.p_worker_lease, "lease-1");
  assert.match(rpcCalls[1].args.p_error, /do not match the declared media type/);
  assert.equal(rpcCalls[1].args.p_preview_object_path, null);
});

test("uploads a derived preview idempotently and completes only the claimed lease", async () => {
  const input = await sharp({
    create: { width: 20, height: 12, channels: 3, background: "#aa6688" },
  }).png().toBuffer();
  const job = {
    job_id: "job-2",
    location_id: "location-1",
    media_asset_id: "asset-1",
    uploaded_by: "user-1",
    object_path: "location-1/user-1/original.png",
    declared_mime_type: "image/png",
    size_bytes: input.length,
    attempt_count: 1,
    worker_lease: "lease-2",
  };
  const uploaded = [];
  const rpcCalls = [];
  const supabase = {
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      return name === "claim_next_media_job"
        ? { data: [job], error: null }
        : { data: true, error: null };
    },
    storage: {
      from: () => ({
        download: async () => ({ data: new Blob([input]), error: null }),
        upload: async (path, body, options) => {
          uploaded.push({ path, body, options });
          return { error: null };
        },
      }),
    },
  };

  assert.equal(await processNextJob(supabase), true);
  assert.equal(uploaded[0].path, "location-1/user-1/derived/job-2.jpg");
  assert.equal(uploaded[0].options.upsert, true);
  assert.equal(uploaded[0].options.contentType, "image/jpeg");
  assert.equal(rpcCalls[1].args.p_preview_object_path, uploaded[0].path);
  assert.equal(rpcCalls[1].args.p_worker_lease, "lease-2");
  assert.equal(rpcCalls[1].args.p_error, null);
});
