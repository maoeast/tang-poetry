const DEFAULT_AUDIO_BASE_URL = "/audio/poetry";

type FileExists = (path: string) => boolean;

export function getAudioUrl(poetryId: string, sourceUid?: string | null) {
  const baseUrl = process.env.AUDIO_BASE_URL ?? DEFAULT_AUDIO_BASE_URL;
  const filename = sourceUid?.trim() || poetryId;
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
