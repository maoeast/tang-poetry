/**
 * Estimate the intro narration duration for a poem audio file.
 *
 * TTS audio files start with "{title}，唐代，{author}。" before the poem body.
 * Chinese TTS at normal speed is roughly 300ms per character.
 * This estimate is approximate but eliminates the worst sync errors.
 */

const MS_PER_CHAR = 300;

export function estimateIntroOffsetMs(title: string, author: string): number {
  // Intro text: "{title}，唐代，{author}。"
  const introLength = title.length + 3 + author.length + 1; // ，唐代 + 。
  return introLength * MS_PER_CHAR;
}
