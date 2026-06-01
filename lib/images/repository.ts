import { db } from "@/lib/db";

const DEFAULT_POETRY_IMAGE_PATH = "/images/placeholders/default-poetry-card.jpg";
const DEFAULT_IMAGE_STYLE = "storybook-watercolor";
const DEFAULT_PROMPT_VERSION = "v1";

type ImageAssetRepository = {
  imageAsset: {
    findFirst: (args: {
      where: {
        poetryId: string;
        status: string;
      };
      select: {
        poetryId: true;
        style: true;
        status: true;
        promptVersion: true;
        imagePath: true;
        thumbPath: true;
        width: true;
        height: true;
      };
      orderBy: Array<{
        updatedAt?: "desc";
        createdAt?: "desc";
      }>;
    }) => Promise<{
      poetryId: string;
      style: string;
      status: string;
      promptVersion: string;
      imagePath: string;
      thumbPath: string | null;
      width: number | null;
      height: number | null;
    } | null>;
  };
};

export type PoetryImage = {
  poetryId: string;
  imagePath: string;
  thumbPath: string | null;
  status: string;
  style: string;
  promptVersion: string;
  width: number | null;
  height: number | null;
  isPlaceholder: boolean;
};

type ImageAssetBatchRepository = {
  imageAsset: {
    findMany: (args: {
      where: { status: string };
      select: {
        poetryId: true;
        style: true;
        status: true;
        promptVersion: true;
        imagePath: true;
        thumbPath: true;
        width: true;
        height: true;
      };
      orderBy: Array<{ updatedAt?: "desc"; createdAt?: "desc" }>;
    }) => Promise<
      Array<{
        poetryId: string;
        style: string;
        status: string;
        promptVersion: string;
        imagePath: string;
        thumbPath: string | null;
        width: number | null;
        height: number | null;
      }>
    >;
  };
};

export async function getAllPoetryImages(
  repository?: ImageAssetBatchRepository,
): Promise<Map<string, PoetryImage>> {
  const targetRepository = repository ?? (db as unknown as ImageAssetBatchRepository);
  const assets = await targetRepository.imageAsset.findMany({
    where: { status: "ready" },
    select: {
      poetryId: true,
      style: true,
      status: true,
      promptVersion: true,
      imagePath: true,
      thumbPath: true,
      width: true,
      height: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const map = new Map<string, PoetryImage>();
  for (const asset of assets) {
    if (!map.has(asset.poetryId)) {
      map.set(asset.poetryId, {
        poetryId: asset.poetryId,
        imagePath: asset.imagePath,
        thumbPath: asset.thumbPath,
        status: asset.status,
        style: asset.style,
        promptVersion: asset.promptVersion,
        width: asset.width,
        height: asset.height,
        isPlaceholder: false,
      });
    }
  }
  return map;
}

export function getPlaceholderImage(poetryId: string): PoetryImage {
  return {
    poetryId,
    imagePath: DEFAULT_POETRY_IMAGE_PATH,
    thumbPath: DEFAULT_POETRY_IMAGE_PATH,
    status: "placeholder",
    style: DEFAULT_IMAGE_STYLE,
    promptVersion: DEFAULT_PROMPT_VERSION,
    width: null,
    height: null,
    isPlaceholder: true,
  };
}

export async function getPoetryImage(
  poetryId: string,
  repository?: ImageAssetRepository,
): Promise<PoetryImage> {
  const targetRepository = repository ?? (db as unknown as ImageAssetRepository);
  const imageAsset = await targetRepository.imageAsset.findFirst({
    where: {
      poetryId,
      status: "ready",
    },
    select: {
      poetryId: true,
      style: true,
      status: true,
      promptVersion: true,
      imagePath: true,
      thumbPath: true,
      width: true,
      height: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (!imageAsset) {
    return getPlaceholderImage(poetryId);
  }

  return {
    poetryId: imageAsset.poetryId,
    imagePath: imageAsset.imagePath,
    thumbPath: imageAsset.thumbPath,
    status: imageAsset.status,
    style: imageAsset.style,
    promptVersion: imageAsset.promptVersion,
    width: imageAsset.width,
    height: imageAsset.height,
    isPlaceholder: false,
  };
}
