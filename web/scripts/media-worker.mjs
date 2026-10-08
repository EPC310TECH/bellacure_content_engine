import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { createMediaPreview, MAX_UPLOAD_BYTES } from "./media-processing.mjs";

const BUCKET = "salon-media";
const IDLE_DELAY_MS = 5_000;
const STOP_POLL_DELAY_MS = 500;
let stopping = false;

process.once("SIGINT", () => { stopping = true; });
process.once("SIGTERM", () => { stopping = true; });

export function createWorkerClient(env = process.env) {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the worker environment.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function processNextJob(supabase) {
  const { data: jobs, error: claimError } = await supabase.rpc("claim_next_media_job");
  if (claimError) throw new Error(`Could not claim a media job: ${claimError.message}`);
  const job = jobs?.[0];
  if (!job) return false;

  try {
    if (job.size_bytes <= 0 || job.size_bytes > MAX_UPLOAD_BYTES) {
      throw new Error("Stored media size is outside the worker's 50 MB limit.");
    }

    const { data: source, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(job.object_path);
    if (downloadError) throw new Error(`Could not download source media: ${downloadError.message}`);

    const input = Buffer.from(await source.arrayBuffer());
    if (input.length !== job.size_bytes) {
      throw new Error("Downloaded media size does not match the recorded upload size.");
    }

    const preview = await createMediaPreview(input, job.declared_mime_type);
    const previewPath = `${job.location_id}/${job.uploaded_by}/derived/${job.job_id}.jpg`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(previewPath, preview, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: true,
    });
    if (uploadError) throw new Error(`Could not save the derived preview: ${uploadError.message}`);

    const { data: completed, error: finishError } = await supabase.rpc("finish_media_job", {
      p_job_id: job.job_id,
      p_worker_lease: job.worker_lease,
      p_preview_object_path: previewPath,
      p_error: null,
    });
    if (finishError) throw new Error(`Preview saved, but job completion could not be recorded: ${finishError.message}`);
    if (!completed) {
      console.warn(`Discarded stale completion for job ${job.job_id}; another worker owns its lease.`);
      return true;
    }

    console.info(`Created private preview for job ${job.job_id} (attempt ${job.attempt_count}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown media processing error.";
    const { data: recorded, error: recordError } = await supabase.rpc("finish_media_job", {
      p_job_id: job.job_id,
      p_worker_lease: job.worker_lease,
      p_preview_object_path: null,
      p_error: message.slice(0, 2000),
    });
    if (recordError) {
      throw new Error(`Job ${job.job_id} failed and its error state could not be recorded: ${recordError.message}`, { cause: error });
    }
    if (!recorded) {
      console.warn(`Could not record stale failure for job ${job.job_id}; another worker owns its lease.`);
      return true;
    }

    console.error(`Media processing failed for job ${job.job_id} (attempt ${job.attempt_count}): ${message}`);
  }

  return true;
}

async function runWorker() {
  const supabase = createWorkerClient();
  console.info("Bellacures media preview worker started.");

  while (!stopping) {
    try {
      const processed = await processNextJob(supabase);
      if (!processed) await delay(IDLE_DELAY_MS);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      await delay(IDLE_DELAY_MS);
    }
  }

  await delay(STOP_POLL_DELAY_MS);
  console.info("Bellacures media preview worker stopped.");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWorker().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
