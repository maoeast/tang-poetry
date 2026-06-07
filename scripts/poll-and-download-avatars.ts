import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const AIIMAGES_DIR = path.join(PROJECT_ROOT, "AIimages");
const TASKS_DIR = path.join(AIIMAGES_DIR, ".apimart-tasks");
const AVATAR_BULK_STATE_PATH = path.join(TASKS_DIR, "author-avatar-bulk-submit.json");

const API_TASK_URL = "https://api.apimart.ai/v1/tasks";
const POLL_CONCURRENCY = 5;
const DOWNLOAD_CONCURRENCY = 3;

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
    return {
      tasks: parsed.tasks || [],
      completedNames: parsed.completedNames || [],
    };
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

async function findNextSuffix(name: string): Promise<number> {
  const files = await readdir(AIIMAGES_DIR).catch(() => [] as string[]);
  let maxSuffix = 0;
  const regex = new RegExp(`^${name}(?:-(\\d+))?\\.png$`);
  for (const f of files) {
    const m = f.match(regex);
    if (m) {
      const suffix = m[1] ? parseInt(m[1], 10) : 1;
      if (suffix > maxSuffix) maxSuffix = suffix;
    }
  }
  return maxSuffix + 1;
}

async function runPollOnly(apiKey: string) {
  const bulkState = await loadBulkState();
  const pendingTasks = bulkState.tasks.filter((t) => t.status === "submitted" || t.status === "processing");
  if (pendingTasks.length === 0) {
    console.log("No pending tasks to poll.");
    return;
  }
  console.log(`Polling ${pendingTasks.length} tasks with ${POLL_CONCURRENCY} workers...`);

  let completedCount = 0, failedCount = 0, stillPendingCount = 0;

  const pollResults = await runWithConcurrency(pendingTasks, POLL_CONCURRENCY, async (task) => {
    try {
      const result = await pollTask(apiKey, task.task_id);
      return { task, result, ok: true as const };
    } catch (err) {
      return { task, result: null, ok: false as const, error: String(err) };
    }
  }, 200);

  for (const res of pollResults) {
    const idx = bulkState.tasks.findIndex((t) => t.task_id === res.task.task_id);
    if (idx === -1) continue;
    if (!res.ok || res.result === null) { stillPendingCount++; continue; }
    const { status, url, error } = res.result;
    if (status === "completed") {
      bulkState.tasks[idx] = { ...bulkState.tasks[idx], status: "completed", url, error };
      completedCount++;
    } else if (status === "failed") {
      bulkState.tasks[idx] = { ...bulkState.tasks[idx], status: "failed", url, error };
      failedCount++;
    } else {
      stillPendingCount++;
    }
  }

  await saveBulkState(bulkState);
  console.log(`\nPoll complete:`);
  console.log(`  Newly completed: ${completedCount}`);
  console.log(`  Newly failed:    ${failedCount}`);
  console.log(`  Still pending:   ${stillPendingCount}`);
  const totalCompleted = bulkState.tasks.filter((t) => t.status === "completed").length;
  const totalFailed = bulkState.tasks.filter((t) => t.status === "failed").length;
  console.log(`\nOverall:`);
  console.log(`  Total completed: ${totalCompleted}`);
  console.log(`  Total failed:    ${totalFailed}`);
  console.log(`  Total pending:   ${bulkState.tasks.filter((t) => t.status === "submitted" || t.status === "processing").length}`);
}

async function runDownloadOnly(dryRun = false) {
  const bulkState = await loadBulkState();
  const downloadableTasks = bulkState.tasks.filter(
    (t) => t.status === "completed" && t.url && !bulkState.completedNames.includes(t.name),
  );
  if (downloadableTasks.length === 0) {
    console.log("No new completed tasks to download.");
    return;
  }
  console.log(`Downloading ${downloadableTasks.length} images with ${DOWNLOAD_CONCURRENCY} workers...`);

  let successCount = 0, failCount = 0;

  const downloadResults = await runWithConcurrency(downloadableTasks, DOWNLOAD_CONCURRENCY, async (task) => {
    try {
      const suffix = await findNextSuffix(task.name);
      const filename = suffix === 1 ? `${task.name}.png` : `${task.name}-${suffix}.png`;
      const dest = path.join(AIIMAGES_DIR, filename);
      if (dryRun) {
        console.log(`[dry-run] Would download ${task.name} -> ${filename}`);
        return { task, ok: true as const };
      }
      await downloadImage(task.url!, dest);
      console.log(`Downloaded: ${task.name} -> ${filename}`);
      return { task, ok: true as const };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Download failed ${task.name}: ${msg.slice(0, 120)}`);
      return { task, ok: false as const };
    }
  }, 500);

  for (const res of downloadResults) {
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

async function main() {
  const pollOnly = process.argv.includes("--poll-only");
  const downloadOnly = process.argv.includes("--download-only");
  const dryRun = process.argv.includes("--dry-run");

  const { api_key: apiKey } = await loadConfig();
  await mkdir(TASKS_DIR, { recursive: true });

  if (pollOnly) {
    await runPollOnly(apiKey);
  } else if (downloadOnly) {
    await runDownloadOnly(dryRun);
  } else {
    console.log("Usage: tsx poll-and-download-avatars.ts --poll-only | --download-only [--dry-run]");
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)) : false;
if (isDirectRun) {
  void main().catch((error) => { console.error(error); process.exitCode = 1; });
}
