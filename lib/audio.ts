const DEFAULT_AUDIO_BASE_URL = "/audio/poetry";

type FileExists = (path: string) => boolean;

const AUDIO_SOURCE_UID_OVERRIDES: Record<string, string> = {
  "ts300-0145": "31cc87f3-da0f-421d-8674-8753530077e2",
};

export function getAudioUrl(poetryId: string, sourceUid?: string | null) {
  const baseUrl = process.env.AUDIO_BASE_URL ?? DEFAULT_AUDIO_BASE_URL;
  const filename =
    AUDIO_SOURCE_UID_OVERRIDES[poetryId]
    || sourceUid?.trim()
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
  const mappedUid = AUDIO_SOURCE_UID_OVERRIDES[poetryId] || sourceUid?.trim();

  if (mappedUid) {
    return fileExists(`public/audio/poetry/${mappedUid}.mp3`);
  }

  return fileExists(`public/audio/poetry/${poetryId}.mp3`);
}
