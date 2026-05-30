const DEFAULT_AUDIO_BASE_URL = "/audio/poetry";

export function getAudioUrl(poetryId: string) {
  const baseUrl = process.env.AUDIO_BASE_URL ?? DEFAULT_AUDIO_BASE_URL;
  return `${baseUrl}/${poetryId}.mp3`;
}

export function getAudioStatus(meta: { status: string } | null) {
  return meta?.status ?? "none";
}
