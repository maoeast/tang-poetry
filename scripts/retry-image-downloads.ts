import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type BatchResult = {
  index: number;
  name: string;
  status: string;
  task_id?: string;
  error?: string;
  saved_paths?: string[];
  urls?: string[];
};

type BatchSummary = {
  source: string;
  total: number;
  success: number;
  failed: number;
  results: BatchResult[];
};

type RetryRecord = {
  name: string;
  url: string;
  outputPath: string;
  sourceSummary: string;
};

const AIIMAGES_DIR = path.join(process.cwd(), "AIimages");
const RETRY_LOG_PATH = path.join(AIIMAGES_DIR, "download-retry-log.json");

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function inferOutputPath(name: string) {
  return path.join(AIIMAGES_DIR, `${name}.png`);
}

async function loadBatchSummaries() {
  const filenames = (await readdir(AIIMAGES_DIR))
    .filter((name) => name.startsWith("batch-summary-") && name.endsWith(".json"))
    .sort();

  const summaries: BatchSummary[] = [];

  for (const filename of filenames) {
    const fullPath = path.join(AIIMAGES_DIR, filename);
    summaries.push(JSON.parse(await readFile(fullPath, "utf8")) as BatchSummary);
  }

  return summaries;
}

function collectRetryRecords(summaries: BatchSummary[]) {
  const retries: RetryRecord[] = [];
  const completedByName = new Map<string, BatchResult>();

  for (const summary of summaries) {
    for (const result of summary.results) {
      if (result.status === "completed" && result.urls && result.urls.length > 0) {
        completedByName.set(result.name, result);
      }
    }
  }

  for (const summary of summaries) {
    for (const result of summary.results) {
      if (
        result.status === "failed" &&
        result.error?.includes("下载图片失败")
      ) {
        const completed = completedByName.get(result.name);
        const url = completed?.urls?.[0];

        if (!url) {
          continue;
        }

        retries.push({
          name: result.name,
          url,
          outputPath: inferOutputPath(result.name),
          sourceSummary: summary.source,
        });
      }
    }
  }

  return retries.filter(
    (record, index, records) =>
      records.findIndex((item) => item.name === record.name) === index,
  );
}

async function downloadFile(url: string, outputPath: string) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await execFileAsync("curl", ["-L", url, "-o", outputPath]);
}

async function main() {
  const summaries = await loadBatchSummaries();
  const retryRecords = collectRetryRecords(summaries);
  const success: string[] = [];
  const failed: Array<{ name: string; reason: string }> = [];

  for (const record of retryRecords) {
    try {
      await downloadFile(record.url, record.outputPath);
      success.push(record.name);
    } catch (error) {
      failed.push({
        name: record.name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await writeFile(
    RETRY_LOG_PATH,
    `${JSON.stringify(
      {
        scannedSummaries: summaries.length,
        retryCount: retryRecords.length,
        successNames: unique(success),
        failed,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        scannedSummaries: summaries.length,
        retryCount: retryRecords.length,
        retriedSuccess: success.length,
        retriedFailed: failed.length,
        logPath: path.relative(process.cwd(), RETRY_LOG_PATH),
      },
      null,
      2,
    ),
  );
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
