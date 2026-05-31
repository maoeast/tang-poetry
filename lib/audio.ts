const DEFAULT_AUDIO_BASE_URL = "/audio/poetry";

export function getAudioUrl(poetryId: string, sourceUid?: string | null) {
  const baseUrl = process.env.AUDIO_BASE_URL ?? DEFAULT_AUDIO_BASE_URL;
  const filename = sourceUid?.trim() || poetryId;
  return `${baseUrl}/${filename}.mp3`;
}

export function getAudioStatus(meta: { status: string } | null) {
  return meta?.status ?? "none";
}
