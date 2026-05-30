export type ImageAssetImportRecord = {
  poetryId: string;
  style: string;
  status: string;
  promptVersion: string;
  imagePath: string;
  thumbPath?: string;
};

type ImageAssetUpsertPayload = {
  where: {
    poetryId_style_promptVersion: {
      poetryId: string;
      style: string;
      promptVersion: string;
    };
  };
  create: ImageAssetImportRecord;
  update: Pick<ImageAssetImportRecord, "status" | "imagePath" | "thumbPath">;
};

type ImageAssetImportSummary = {
  totalRecords: number;
  uniquePoetryIds: number;
  styles: string[];
  promptVersions: string[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateImageAssetRecord(
  record: unknown,
  index: number,
): ImageAssetImportRecord {
  if (typeof record !== "object" || record === null) {
    throw new Error(`image asset record at index ${index} must be an object`);
  }

  const candidate = record as Record<string, unknown>;

  if (!isNonEmptyString(candidate.poetryId)) {
    throw new Error(`image asset record at index ${index} has invalid poetryId`);
  }

  if (!isNonEmptyString(candidate.style)) {
    throw new Error(`image asset record at index ${index} has invalid style`);
  }

  if (!isNonEmptyString(candidate.status)) {
    throw new Error(`image asset record at index ${index} has invalid status`);
  }

  if (!isNonEmptyString(candidate.promptVersion)) {
    throw new Error(
      `image asset record at index ${index} has invalid promptVersion`,
    );
  }

  if (!isNonEmptyString(candidate.imagePath)) {
    throw new Error(`image asset record at index ${index} has invalid imagePath`);
  }

  if (
    candidate.thumbPath !== undefined &&
    candidate.thumbPath !== null &&
    !isNonEmptyString(candidate.thumbPath)
  ) {
    throw new Error(`image asset record at index ${index} has invalid thumbPath`);
  }

  return {
    poetryId: candidate.poetryId,
    style: candidate.style,
    status: candidate.status,
    promptVersion: candidate.promptVersion,
    imagePath: candidate.imagePath,
    thumbPath: candidate.thumbPath ?? undefined,
  };
}

export function validateImageAssetRecords(
  records: unknown,
): ImageAssetImportRecord[] {
  if (!Array.isArray(records)) {
    throw new Error("image asset payload must be an array");
  }

  return records.map((record, index) => validateImageAssetRecord(record, index));
}

export function buildImageAssetUpsertPayload(
  record: ImageAssetImportRecord,
): ImageAssetUpsertPayload {
  return {
    where: {
      poetryId_style_promptVersion: {
        poetryId: record.poetryId,
        style: record.style,
        promptVersion: record.promptVersion,
      },
    },
    create: record,
    update: {
      status: record.status,
      imagePath: record.imagePath,
      thumbPath: record.thumbPath,
    },
  };
}

export function summarizeImageAssetImport(
  records: ImageAssetImportRecord[],
): ImageAssetImportSummary {
  return {
    totalRecords: records.length,
    uniquePoetryIds: new Set(records.map((record) => record.poetryId)).size,
    styles: [...new Set(records.map((record) => record.style))].sort(),
    promptVersions: [...new Set(records.map((record) => record.promptVersion))].sort(),
  };
}
