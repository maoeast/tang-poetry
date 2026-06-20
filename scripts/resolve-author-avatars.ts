import { mkdir, readFile, readdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const DATA_DIR = path.join(PROJECT_ROOT, "data");
const AIIMAGES_DIR = path.join(PROJECT_ROOT, "AIimages");
const PUBLIC_AUTHORS_DIR = path.join(PROJECT_ROOT, "public", "images", "authors");
const BATCHES_DIR = path.join(AIIMAGES_DIR, "batches");
const TASKS_DIR = path.join(AIIMAGES_DIR, ".apimart-tasks");
const AVATAR_BULK_STATE_PATH = path.join(TASKS_DIR, "author-avatar-bulk-submit-v2.json");

const AUTHORS_PATH = path.join(DATA_DIR, "authors.json");
const PROGRESS_PATH = path.join(AIIMAGES_DIR, ".author-avatar-progress.json");
const BATCH_PATH = path.join(BATCHES_DIR, "author-avatar-batch.json");

const API_GENERATIONS_URL = "https://api.apimart.ai/v1/images/generations";
const API_TASK_URL = "https://api.apimart.ai/v1/tasks";

// ---- types ----

type BatchJob = { name: string; prompt: string; size?: string; resolution?: string; model?: string };

type TaskState = {
  task_id: string;
  name: string;
  status: "submitted" | "processing" | "completed" | "failed";
  url?: string;
  error?: string;
};

type BulkState = {
  tasks: TaskState[];
  completedNames: string[];
};

type Author = {
  name: string;
  nameZhHant?: string;
  avatarUrl?: string;
  dynasty: string;
  courtesyName?: string | null;
  literaryName?: string | null;
  bio?: string;
  lifeStory?: string;
};

// ---- helpers ----

async function loadAuthors(): Promise<Author[]> {
  const raw = await readFile(AUTHORS_PATH, "utf8");
  return JSON.parse(raw);
}

async function loadProgress(): Promise<Record<string, { prompt: string; dynasty: string; headwear: string }>> {
  const raw = await readFile(PROGRESS_PATH, "utf8");
  return JSON.parse(raw);
}

async function loadBatch(): Promise<{ defaults: Record<string, string>; jobs: BatchJob[] }> {
  const raw = await readFile(BATCH_PATH, "utf8");
  return JSON.parse(raw);
}

async function loadConfig(): Promise<{ api_key: string }> {
  for (const loc of ["config.json", "AIimages/config.json"]) {
    try {
      const raw = await readFile(path.join(PROJECT_ROOT, loc), "utf8");
      return JSON.parse(raw);
    } catch { /* continue */ }
  }
  throw new Error("apimart config.json not found");
}

async function loadBulkState(): Promise<BulkState> {
  try {
    const raw = await readFile(AVATAR_BULK_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { tasks: parsed.tasks || [], completedNames: parsed.completedNames || [] };
  } catch {
    return { tasks: [], completedNames: [] };
  }
}

async function saveBulkState(state: BulkState) {
  await writeFile(AVATAR_BULK_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function submitTask(apiKey: string, job: BatchJob): Promise<{ task_id: string }> {
  const payload = {
    model: job.model || "gpt-image-2",
    prompt: job.prompt,
    size: job.size || "1:1",
    resolution: job.resolution || "1k",
  };
  const response = await fetch(API_GENERATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Submit ${response.status}: ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { code: number; data: Array<{ status: string; task_id: string }> };
  const taskId = data.data?.[0]?.task_id;
  if (!taskId) throw new Error("No task_id in response");
  return { task_id: taskId };
}

async function pollTask(apiKey: string, taskId: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_TASK_URL}/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Poll ${response.status}: ${text.slice(0, 200)}`);
    }
    const data = (await response.json()) as {
      data?: {
        status: string;
        result?: { images?: Array<{ url: string[] }> };
        error?: { message?: string };
      };
    };
    const task = data.data;
    if (!task) throw new Error("Empty task data");
    const status = task.status;
    let imageUrl: string | undefined;
    let errorMsg: string | undefined;
    if (status === "completed") {
      imageUrl = task.result?.images?.[0]?.url?.[0];
    } else if (status === "failed") {
      errorMsg = task.error?.message || "Unknown error";
    }
    return { status, url: imageUrl, error: errorMsg };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") return null;
    throw err;
  }
}

async function downloadImage(url: string, destPath: string, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`Download ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destPath, buffer);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>, delayMs = 0): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try { results[i] = await fn(items[i]!); } catch (err) { results[i] = err as R; }
      if (delayMs > 0 && index < items.length) await sleep(delayMs);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

// ---- main ----

async function main() {
  const submitOnly = process.argv.includes("--submit-only");
  const pollOnly = process.argv.includes("--poll-only");
  const downloadOnly = process.argv.includes("--download-only");
  const copyOnly = process.argv.includes("--copy-only");
  const dryRun = process.argv.includes("--dry-run");

  const authors = await loadAuthors();
  const progress = await loadProgress();
  const batch = await loadBatch();

  // Build mapping: basename -> list of authors
  const basenameToAuthors: Record<string, { author: Author; prompt: string }[]> = {};
  let jobIdx = 0;
  for (const author of authors) {
    if (!progress[author.name]) continue;
    const job = batch.jobs[jobIdx++];
    if (!basenameToAuthors[job.name]) basenameToAuthors[job.name] = [];
    basenameToAuthors[job.name].push({ author, prompt: job.prompt });
  }

  // Separate unique and duplicate basenames
  const uniqueMappings: { author: Author; basename: string }[] = [];
  const duplicateGroups: { author: Author; oldBasename: string; prompt: string }[] = [];

  for (const [basename, list] of Object.entries(basenameToAuthors)) {
    if (list.length === 1) {
      uniqueMappings.push({ author: list[0].author, basename });
    } else {
      for (const item of list) {
        duplicateGroups.push({ author: item.author, oldBasename: basename, prompt: item.prompt });
      }
    }
  }

  console.log(`Unique basenames: ${uniqueMappings.length}`);
  console.log(`Authors in duplicate groups: ${duplicateGroups.length}`);

  if (copyOnly) {
    // Copy unique images directly
    await mkdir(PUBLIC_AUTHORS_DIR, { recursive: true });
    let copied = 0;
    for (const { author, basename } of uniqueMappings) {
      const src = path.join(AIIMAGES_DIR, `${basename}.png`);
      const dest = path.join(PUBLIC_AUTHORS_DIR, `${basename}.jpg`);
      try {
        if (dryRun) {
          console.log(`[dry-run] Would copy ${src} -> ${dest}`);
          continue;
        }
        await copyFile(src, dest);
        copied++;
        console.log(`Copied: ${author.name} -> ${basename}.jpg`);
      } catch (err) {
        console.error(`Missing file for ${author.name}: ${basename}.png`);
      }
    }
    console.log(`\nCopied ${copied} unique images.`);

    // Update authors.json for unique ones
    if (!dryRun) {
      for (const { author, basename } of uniqueMappings) {
        author.avatarUrl = `/images/authors/${basename}.jpg`;
      }
      await writeFile(AUTHORS_PATH, JSON.stringify(authors, null, 2), "utf8");
      console.log("Updated authors.json");
    }
    return;
  }

  if (submitOnly || (!pollOnly && !downloadOnly)) {
    // Build new batch for duplicates with unique names
    const newJobs: BatchJob[] = duplicateGroups.map((g, idx) => ({
      name: `${g.oldBasename}_${idx}`,
      prompt: g.prompt,
      size: batch.defaults.size,
      resolution: batch.defaults.resolution,
      model: batch.defaults.model,
    }));

    console.log(`\nBuilding new batch for ${newJobs.length} duplicate authors...`);

    const newBatchPath = path.join(BATCHES_DIR, "author-avatar-batch-v2.json");
    await writeFile(newBatchPath, JSON.stringify({ defaults: batch.defaults, jobs: newJobs }, null, 2), "utf8");
    console.log(`Wrote: ${newBatchPath}`);

    if (dryRun) {
      console.log("\n--dry-run: would submit:");
      for (const j of newJobs.slice(0, 10)) console.log(`  ${j.name}`);
      if (newJobs.length > 10) console.log(`  ... and ${newJobs.length - 10} more`);
      return;
    }

    const { api_key: apiKey } = await loadConfig();
    await mkdir(TASKS_DIR, { recursive: true });
    const bulkState = await loadBulkState();

    const existingNames = new Set(bulkState.tasks.map((t) => t.name));
    const pendingJobs = newJobs.filter((j) => !existingNames.has(j.name));

    if (pendingJobs.length === 0) {
      console.log("All duplicate authors already submitted.");
    } else {
      console.log(`\nSubmitting ${pendingJobs.length} jobs with 15 workers...`);
      const results = await runWithConcurrency(pendingJobs, 15, async (job) => {
        try {
          const { task_id } = await submitTask(apiKey, job);
          return { success: true as const, task_id, name: job.name };
        } catch (err) {
          return { success: false as const, error: String(err), name: job.name };
        }
      });

      let success = 0, fail = 0;
      for (const r of results) {
        if (r.success) {
          bulkState.tasks.push({ task_id: r.task_id, name: r.name, status: "submitted" });
          success++;
        } else {
          console.error(`Failed ${r.name}: ${r.error}`);
          fail++;
        }
      }
      await saveBulkState(bulkState);
      console.log(`\nSubmit done: ${success} success, ${fail} failed`);
    }
  }

  if (pollOnly) {
    const { api_key: apiKey } = await loadConfig();
    const bulkState = await loadBulkState();
    const pendingTasks = bulkState.tasks.filter((t) => t.status === "submitted" || t.status === "processing");
    if (pendingTasks.length === 0) {
      console.log("No pending tasks.");
      return;
    }
    console.log(`Polling ${pendingTasks.length} tasks...`);
    let completedCount = 0, failedCount = 0, stillPending = 0;
    const results = await runWithConcurrency(pendingTasks, 5, async (task) => {
      try {
        const result = await pollTask(apiKey, task.task_id);
        return { task, result, ok: true as const };
      } catch (err) {
        return { task, result: null, ok: false as const };
      }
    }, 200);

    for (const res of results) {
      const idx = bulkState.tasks.findIndex((t) => t.task_id === res.task.task_id);
      if (idx === -1) continue;
      if (!res.ok || res.result === null) { stillPending++; continue; }
      const { status, url, error } = res.result;
      if (status === "completed") {
        bulkState.tasks[idx] = { ...bulkState.tasks[idx], status: "completed", url, error };
        completedCount++;
      } else if (status === "failed") {
        bulkState.tasks[idx] = { ...bulkState.tasks[idx], status: "failed", url, error };
        failedCount++;
      } else {
        stillPending++;
      }
    }
    await saveBulkState(bulkState);
    console.log(`\nPoll complete: ${completedCount} completed, ${failedCount} failed, ${stillPending} pending`);
  }

  if (downloadOnly) {
    const bulkState = await loadBulkState();
    const downloadable = bulkState.tasks.filter(
      (t) => t.status === "completed" && t.url && !bulkState.completedNames.includes(t.name),
    );
    if (downloadable.length === 0) {
      console.log("No new completed tasks to download.");
      return;
    }
    console.log(`Downloading ${downloadable.length} images...`);
    let successCount = 0, failCount = 0;
    const results = await runWithConcurrency(downloadable, 3, async (task) => {
      try {
        const dest = path.join(AIIMAGES_DIR, `${task.name}.png`);
        if (dryRun) {
          console.log(`[dry-run] Would download ${task.name}`);
          return { task, ok: true as const };
        }
        await downloadImage(task.url!, dest);
        console.log(`Downloaded: ${task.name}`);
        return { task, ok: true as const };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Download failed ${task.name}: ${msg.slice(0, 120)}`);
        return { task, ok: false as const };
      }
    }, 500);
    for (const res of results) {
      if (res.ok) {
        bulkState.completedNames.push(res.task.name);
        successCount++;
      } else {
        failCount++;
      }
    }
    await saveBulkState(bulkState);
    console.log(`\nDownload complete: ${successCount} success, ${failCount} failed`);
  }
}

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)) : false;
if (isDirectRun) {
  void main().catch((error) => { console.error(error); process.exitCode = 1; });
}
