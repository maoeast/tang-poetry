import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ImageAssetImportRecord = {
  poetryId: string;
  style: string;
  status: string;
  promptVersion: string;
  imagePath: string;
  thumbPath: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const GENERATED_IMAGE_DIR = path.join(process.cwd(), "public", "images", "generated");
const IMAGE_ASSETS_PATH = path.join(DATA_DIR, "image-assets.json");
const STYLE = "storybook-watercolor";
const PROMPT_VERSION = "v1";
const DEFAULT_IMAGE_PATH = "/images/placeholders/default-poetry-card.jpg";

export async function fileExists(targetPath: string) {
  try {
    await readFile(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function toGeneratedImagePath(poetryId: string) {
  return `/images/generated/${poetryId}.png`;
}

export function toGeneratedThumbPath(poetryId: string) {
  return `/images/generated/${poetryId}-thumb.png`;
}

export async function finalizeImageAssetRecords(records: ImageAssetImportRecord[]) {
  return Promise.all(
    records.map(async (record) => {
      const imageFilePath = path.join(GENERATED_IMAGE_DIR, `${record.poetryId}.png`);
      const thumbFilePath = path.join(GENERATED_IMAGE_DIR, `${record.poetryId}-thumb.png`);
      const hasImage = await fileExists(imageFilePath);
      const hasThumb = await fileExists(thumbFilePath);

      if (!hasImage) {
        return {
          ...record,
          status: "placeholder",
          imagePath: DEFAULT_IMAGE_PATH,
          thumbPath: DEFAULT_IMAGE_PATH,
        };
      }

      return {
        poetryId: record.poetryId,
        style: STYLE,
        status: "ready",
        promptVersion: PROMPT_VERSION,
        imagePath: toGeneratedImagePath(record.poetryId),
        thumbPath: hasThumb
          ? toGeneratedThumbPath(record.poetryId)
          : toGeneratedImagePath(record.poetryId),
      };
    }),
  );
}

async function main() {
  const records = JSON.parse(await readFile(IMAGE_ASSETS_PATH, "utf8")) as ImageAssetImportRecord[];
  const nextRecords = await finalizeImageAssetRecords(records);

  await writeFile(IMAGE_ASSETS_PATH, `${JSON.stringify(nextRecords, null, 2)}\n`, "utf8");

  const readyCount = nextRecords.filter((record) => record.status === "ready").length;

  console.log(
    JSON.stringify(
      {
        totalRecords: nextRecords.length,
        readyCount,
        placeholderCount: nextRecords.length - readyCount,
        generatedDir: path.relative(process.cwd(), GENERATED_IMAGE_DIR),
        imageAssetsPath: path.relative(process.cwd(), IMAGE_ASSETS_PATH),
      },
      null,
      2,
    ),
  );
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (isDirectRun) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
