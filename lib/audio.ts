import type { ExplanationAudience } from "@/lib/ai/prompts";

const DEFAULT_AUDIO_BASE_URL = "/audio/poetry";
const EXPLAIN_AUDIO_DIR = "public/audio/explain";

type FileExists = (path: string) => boolean;

export function getAudioUrl(poetryId: string, sourceUid?: string | null) {
  const baseUrl = process.env.AUDIO_BASE_URL ?? DEFAULT_AUDIO_BASE_URL;
  const filename =
    sourceUid?.trim()
    || poetryId;
  return `${baseUrl}/${filename}.mp3`;
}

export function getAudioStatus(meta: { status: string } | null) {
  return meta?.status ?? "none";
}

export function hasMappedAudioFile(
  poetryId: string,
  sourceUid?: string | null,
  fileExists: FileExists = () => false,
) {
  const mappedUid = sourceUid?.trim();

  if (mappedUid) {
    return fileExists(`public/audio/poetry/${mappedUid}.mp3`);
  }

  return fileExists(`public/audio/poetry/${poetryId}.mp3`);
}

export function getExplainAudioUrl(poetryId: string, audience: ExplanationAudience) {
  return `/audio/explain/${poetryId}_${audience}.mp3`;
}

export function hasExplainAudioFile(
  poetryId: string,
  audience: ExplanationAudience,
  fileExists: FileExists = () => false,
) {
  return fileExists(`${EXPLAIN_AUDIO_DIR}/${poetryId}_${audience}.mp3`);
}
