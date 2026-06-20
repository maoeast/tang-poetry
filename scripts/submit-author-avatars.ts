import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const BATCH_PATH = path.join(PROJECT_ROOT, "AIimages", "batches", "author-avatar-batch.json");
const TASKS_DIR = path.join(PROJECT_ROOT, "AIimages", ".apimart-tasks");
const AVATAR_BULK_STATE_PATH = path.join(TASKS_DIR, "author-avatar-bulk-submit.json");

const API_GENERATIONS_URL = "https://api.apimart.ai/v1/images/generations";
const CONCURRENCY = 15;

type BatchJob = { name: string; prompt: string; size?: string; resolution?: string; model?: string };
type TaskState = { task_id: string; name: string; status: "submitted" | "processing" | "completed" | "failed"; url?: string; error?: string };

async function loadConfig(): Promise<{ api_key: string }> {
  for (const loc of ["config.json", "AIimages/config.json"]) {
    try {
      const raw = await readFile(path.join(PROJECT_ROOT, loc), "utf8");
      return JSON.parse(raw);
    } catch { /* continue */ }
  }
  throw new Error("apimart config.json not found");
}

async function loadBulkState(): Promise<{ tasks: TaskState[] }> {
  try {
    const raw = await readFile(AVATAR_BULK_STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { tasks: [] };
  }
}

async function saveBulkState(state: { tasks: TaskState[] }) {
  await writeFile(AVATAR_BULK_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
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

async function runWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try { results[i] = await fn(items[i]!); } catch (err) { results[i] = err as R; }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const raw = await readFile(BATCH_PATH, "utf8");
  const batch = JSON.parse(raw) as { defaults: Record<string, string>; jobs: BatchJob[] };

  console.log(`Loaded ${batch.jobs.length} avatar jobs from batch.`);

  // Enrich jobs with defaults
  const jobs = batch.jobs.map((j) => ({
    ...j,
    size: j.size || batch.defaults.size,
    resolution: j.resolution || batch.defaults.resolution,
    model: j.model || batch.defaults.model,
  }));

  const { api_key: apiKey } = await loadConfig();
  await mkdir(TASKS_DIR, { recursive: true });
  const bulkState = await loadBulkState();

  // Exclude already submitted names
  const existingNames = new Set(bulkState.tasks.map((t) => t.name));
  const pendingJobs = jobs.filter((j) => !existingNames.has(j.name));

  console.log(`Already submitted: ${existingNames.size}, New: ${pendingJobs.length}`);

  if (pendingJobs.length === 0) {
    console.log("Nothing new to submit.");
    return;
  }

  if (dryRun) {
    console.log("\n--dry-run: would submit:");
    for (const j of pendingJobs.slice(0, 10)) console.log(`  ${j.name}`);
    if (pendingJobs.length > 10) console.log(`  ... and ${pendingJobs.length - 10} more`);
    return;
  }

  console.log(`\nSubmitting ${pendingJobs.length} jobs with ${CONCURRENCY} workers...`);

  const results = await runWithConcurrency(pendingJobs, CONCURRENCY, async (job) => {
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
  console.log(`\nDone: ${success} submitted, ${fail} failed.`);
  console.log(`State saved to: ${AVATAR_BULK_STATE_PATH}`);
}

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)) : false;
if (isDirectRun) {
  void main().catch((e) => { console.error(e); process.exitCode = 1; });
}
