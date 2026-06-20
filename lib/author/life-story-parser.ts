/** A single parsed chapter from a lifeStory */
export type LifeStoryChapter = {
  heading: string;
  index: number;
  content: string;
};

/** Result of parsing a raw lifeStory string */
export type ParsedLifeStory = {
  format: "inline" | "newline" | "plain";
  cleanText: string;
  chapters: LifeStoryChapter[];
};

const HEADING_RE = /^([\u4e00-\u9fff]{2,8})\u3000\u3000/;
const TRAILING_RE = /\s*▲\s*(\n\n参考资料：完善)?\s*$/;
const REFERENCE_RE = /\n\n参考资料：完善\s*$/;

/** Strip trailing ▲ and 参考资料：完善 */
export function stripTrailingJunk(text: string): string {
  let clean = text.trimEnd();
  clean = clean.replace(TRAILING_RE, "");
  clean = clean.replace(REFERENCE_RE, "");
  return clean.trimEnd();
}

/** Detect which format a cleaned text uses */
export function detectFormat(text: string): "inline" | "newline" | "plain" {
  if (text.length < 4) return "plain";

  const blocks = text.split("\n\n");

  // Inline: blocks that start with 标题\u3000\u3000 (heading + fullwidth delimiter)
  const inlineCount = blocks.filter((b) => HEADING_RE.test(b.trim())).length;
  if (inlineCount >= 1) return "inline";

  // Newline: isolated short heading lines (title on its own block)
  const headingCount = blocks.filter((b) => isShortHeading(b.trim())).length;
  if (headingCount >= 2) return "newline";

  return "plain";
}

/** Parse inline-separated text (heading\u3000\u3000content blocks) */
export function parseInlineFormat(text: string): LifeStoryChapter[] {
  const blocks = text.split("\n\n");
  const chapters: LifeStoryChapter[] = [];
  let current: { heading: string; parts: string[] } | null = null;

  for (const block of blocks) {
    const match = block.match(HEADING_RE);
    if (match) {
      if (current) {
        chapters.push({
          heading: current.heading,
          index: chapters.length,
          content: current.parts.join("\n\n"),
        });
      }
      current = { heading: match[1], parts: [block.slice(match[0].length)] };
    } else if (current) {
      current.parts.push(block);
    }
  }

  if (current) {
    chapters.push({
      heading: current.heading,
      index: chapters.length,
      content: current.parts.join("\n\n"),
    });
  }

  return chapters;
}

/** Parse newline-separated headings (short standalone lines) */
export function parseNewlineFormat(text: string): LifeStoryChapter[] {
  const blocks = text.split("\n\n");
  const chapters: LifeStoryChapter[] = [];
  let current: { heading: string; parts: string[] } | null = null;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (isShortHeading(trimmed)) {
      if (current) {
        chapters.push({
          heading: current.heading,
          index: chapters.length,
          content: current.parts.join("\n\n"),
        });
      }
      current = { heading: trimmed, parts: [] };
    } else if (current) {
      current.parts.push(block);
    }
  }

  if (current) {
    chapters.push({
      heading: current.heading,
      index: chapters.length,
      content: current.parts.join("\n\n"),
    });
  }

  return chapters;
}

/** Main entry: parse raw lifeStory into structured form */
export function parseLifeStory(raw: string): ParsedLifeStory {
  const cleanText = stripTrailingJunk(raw);
  const format = detectFormat(cleanText);

  if (format === "plain") {
    return { format, cleanText, chapters: [] };
  }

  const chapters =
    format === "inline"
      ? parseInlineFormat(cleanText)
      : parseNewlineFormat(cleanText);

  return { format, cleanText, chapters };
}

/** Check if a string is a short heading (2-8 CJK chars, no punctuation) */
function isShortHeading(text: string): boolean {
  if (text.length < 2 || text.length > 8) return false;
  return /^[\u4e00-\u9fff]+$/.test(text);
}

// ── PoetTimeline 适配层 ─────────────────────────────────

/** Matches: 唐永昌元年（689年）, 开元十五年（727年）, 天宝元年（公元742年）, 上元三年 (762年) */
const YEAR_ERA_RE = /([\u4e00-\u9fff]*[\d一二三四五六七八九十百千万元初]+年?)[\s]*[（(](?:公元)?(\d+年?)[）)]/g;

/**
 * Extract structured events from chapter content text.
 * Splits text at year-era markers into individual events.
 */
function extractEvents(content: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const paragraphs = content.split(/\n\n+/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Try to find all year-era markers in this paragraph
    const matches = [...trimmed.matchAll(YEAR_ERA_RE)];

    if (matches.length === 0) {
      // No year markers — treat whole paragraph as one event
      events.push({ year: "", era: "", text: trimmed });
      continue;
    }

    // Split paragraph at each year marker
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const matchStart = m.index!;
      const matchEnd = matchStart + m[0].length;

      // Text before this match belongs to previous event (or is skipped if first)
      if (i === 0 && matchStart > 0) {
        // Leading text before first year marker
        const leading = trimmed.slice(0, matchStart).replace(/^[，,、]\s*/, "");
        if (leading) {
          events.push({ year: "", era: "", text: leading });
        }
      }

      // Find end of this event: start of next match, or end of string
      const nextStart = i + 1 < matches.length ? matches[i + 1].index! : trimmed.length;
      // Event text starts after the year-era marker
      let eventText = trimmed.slice(matchEnd, nextStart).trim();
      // Remove leading comma/period
      eventText = eventText.replace(/^[，,：:]\s*/, "");

      const year = m[2].replace("年", "") + "年";
      const era = m[1];

      if (eventText) {
        events.push({ year, era, text: eventText });
      } else {
        // Year marker with no trailing text — combine with next
        // Just use the year marker info as the event
        events.push({ year, era, text: trimmed.slice(matchStart, matchEnd) });
      }
    }
  }

  return events;
}

/**
 * Derive a period string from events (e.g., "689 — 740 年").
 */
function derivePeriod(events: TimelineEvent[]): string {
  const years = events
    .map((e) => e.year.replace("年", ""))
    .filter((y) => /^\d+$/.test(y))
    .map(Number);

  if (years.length === 0) return "";
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? `${min} 年` : `${min} — ${max} 年`;
}

/**
 * Extract the first sentence as summary.
 */
function extractSummary(content: string): string {
  const match = content.match(/^[^。！？]+[。！？]/);
  return match ? match[0] : content.slice(0, 60) + "…";
}

/**
 * Adapt parsed lifeStory into TimelineChapter[] for PoetTimeline.
 * Returns null if data is insufficient (plain text, empty chapters, etc.).
 */
export function adaptToTimeline(parsed: ParsedLifeStory): TimelineChapter[] | null {
  if (parsed.format === "plain") return null;
  if (parsed.chapters.length === 0) return null;

  const chapters: TimelineChapter[] = [];

  for (const ch of parsed.chapters) {
    const events = extractEvents(ch.content);
    // Skip chapters that yield no usable events
    if (events.length === 0) continue;

    chapters.push({
      tab: ch.heading,
      period: derivePeriod(events),
      summary: extractSummary(ch.content),
      events,
    });
  }

  return chapters.length > 0 ? chapters : null;
}

export interface TimelineEvent {
  year: string;
  era: string;
  text: string;
  tag?: "poem" | "turn" | "friend" | "hidden" | null;
}

export interface TimelineChapter {
  tab: string;
  period: string;
  summary: string;
  events: TimelineEvent[];
}
