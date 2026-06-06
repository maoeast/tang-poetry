const CJK_SPLIT_REGEX = /[一-鿿㐀-䶿]/;

/**
 * Split couplet lines into individual hemistiches for classic display.
 * Each comma-separated segment becomes its own line, with pinyin syllables
 * distributed proportionally based on CJK character count per segment.
 */
export function splitCoupletLines(
  lines: string[],
  pinyin: string[],
): { text: string; pinyin?: string; originalIndex: number }[] {
  const result: { text: string; pinyin?: string; originalIndex: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const syllables = pinyin[i]?.trim().split(/\s+/) ?? [];

    const parts: string[] = [];
    let start = 0;
    for (let j = 0; j < text.length; j++) {
      if ("，？！；：。".includes(text[j])) {
        parts.push(text.substring(start, j + 1));
        start = j + 1;
      }
    }
    if (start < text.length) {
      parts.push(text.substring(start));
    }

    if (parts.length <= 1) {
      result.push({ text, pinyin: pinyin[i] || undefined, originalIndex: i });
      continue;
    }

    let syllableOffset = 0;
    for (const segment of parts) {
      if (!segment) continue;
      const segCjkCount = [...segment].filter((c) => CJK_SPLIT_REGEX.test(c)).length;
      const segPinyin =
        syllables.length >= syllableOffset + segCjkCount
          ? syllables.slice(syllableOffset, syllableOffset + segCjkCount).join(" ")
          : undefined;
      result.push({ text: segment, pinyin: segPinyin, originalIndex: i });
      syllableOffset += segCjkCount;
    }
  }

  return result;
}
