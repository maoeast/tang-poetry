export type Ts300ExportRecord = {
  id: string;
  sourceId: number | null;
  sourceUid: string;
  title: string;
  titleOriginal: string | null;
  titleZhHans: string | null;
  titleZhHant: string | null;
  author: string;
  authorOriginal: string | null;
  authorZhHans: string | null;
  authorZhHant: string | null;
  dynasty: string;
  lines: unknown;
  linesZhHans: unknown;
  linesZhHant: unknown;
  tags: unknown;
  themes: unknown;
  difficulty: number;
  imageKey: string | null;
  imageStatus: string;
  translation: string | null;
  annotation: string | null;
  pinyin: unknown;
  aiExplanation: unknown;
};

export type Ts300SimplePoem = {
  author: string;
  paragraphs: string[];
  tags: string[];
  title: string;
  id: string;
};

export type Ts300RawPoem = {
  author: string;
  paragraphs: string[];
  tags: string[];
  title: string;
  id: string;
};

export type Ts300NormalizedPoem = {
  id: string;
  sourceId: number;
  sourceUid: string;
  title: string;
  titleOriginal: string;
  titleZhHans: string;
  titleZhHant: string;
  author: string;
  authorOriginal: string;
  authorZhHans: string;
  authorZhHant: string;
  dynasty: string;
  lines: string[];
  linesZhHans: string[];
  linesZhHant: string[];
  tags: string[];
  themes: string[];
  difficulty: number;
  imageKey: string;
  imageStatus: string;
};

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toRequiredString(value: string | null | undefined, fallback: string) {
  const next = value?.trim();
  return next && next.length > 0 ? next : fallback;
}

function compareByPoetryId(a: { id: string }, b: { id: string }) {
  return a.id.localeCompare(b.id);
}

export function buildTs300SimplePoems(records: Ts300ExportRecord[]): Ts300SimplePoem[] {
  return [...records]
    .sort(compareByPoetryId)
    .map((record) => ({
      author: record.author,
      paragraphs: toStringArray(record.linesZhHans),
      tags: toStringArray(record.tags),
      title: toRequiredString(record.titleZhHans, record.title),
      id: record.sourceUid,
    }));
}

export function buildTs300RawPoems(records: Ts300ExportRecord[]): Ts300RawPoem[] {
  return [...records]
    .sort(compareByPoetryId)
    .map((record) => ({
      author: toRequiredString(record.authorOriginal, record.author),
      paragraphs: toStringArray(record.linesZhHant),
      tags: toStringArray(record.tags),
      title: toRequiredString(record.titleOriginal, record.title),
      id: record.sourceUid,
    }));
}

export function buildTs300NormalizedPoems(records: Ts300ExportRecord[]): Ts300NormalizedPoem[] {
  return [...records]
    .sort(compareByPoetryId)
    .map((record, index) => ({
      id: record.id,
      sourceId: record.sourceId ?? index + 1,
      sourceUid: record.sourceUid,
      title: record.title,
      titleOriginal: toRequiredString(record.titleOriginal, record.title),
      titleZhHans: toRequiredString(record.titleZhHans, record.title),
      titleZhHant: toRequiredString(record.titleZhHant, record.title),
      author: record.author,
      authorOriginal: toRequiredString(record.authorOriginal, record.author),
      authorZhHans: toRequiredString(record.authorZhHans, record.author),
      authorZhHant: toRequiredString(record.authorZhHant, record.author),
      dynasty: record.dynasty,
      lines: toStringArray(record.lines),
      linesZhHans: toStringArray(record.linesZhHans),
      linesZhHant: toStringArray(record.linesZhHant),
      tags: toStringArray(record.tags),
      themes: toStringArray(record.themes),
      difficulty: record.difficulty,
      imageKey: toRequiredString(record.imageKey, record.id),
      imageStatus: record.imageStatus,
    }));
}

export function findStaleIds(currentIds: Iterable<string>, manifestIds: Iterable<string>) {
  const currentIdSet = new Set(currentIds);
  return [...new Set(manifestIds)].filter((id) => !currentIdSet.has(id)).sort();
}

export function findMissingIds(currentIds: Iterable<string>, manifestIds: Iterable<string>) {
  const manifestIdSet = new Set(manifestIds);
  return [...new Set(currentIds)].filter((id) => !manifestIdSet.has(id)).sort();
}

export function findStaleExplainAudioFiles(fileNames: Iterable<string>, validPoetryIds: Iterable<string>) {
  const validIdSet = new Set(validPoetryIds);

  return [...new Set(fileNames)]
    .filter((fileName) => /_(child|general)\.mp3$/i.test(fileName))
    .filter((fileName) => {
      const poetryId = fileName.replace(/_(child|general)\.mp3$/i, "");
      return !validIdSet.has(poetryId);
    })
    .sort();
}

export function findOrphanPoetryAudioFiles(
  fileNames: Iterable<string>,
  validSourceUids: Iterable<string>,
) {
  const validUidSet = new Set(validSourceUids);

  return [...new Set(fileNames)]
    .filter((fileName) => /^[0-9a-f-]{36}\.mp3$/i.test(fileName))
    .filter((fileName) => !validUidSet.has(fileName.replace(/\.mp3$/i, "")))
    .sort();
}
