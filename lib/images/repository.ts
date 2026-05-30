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
