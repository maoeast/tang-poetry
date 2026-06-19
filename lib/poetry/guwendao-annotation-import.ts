import * as cheerio from "cheerio";

export const TITLE_ALIASES: Record<string, string[]> = {
  "山中送别": ["送别"],
  "宫中词": ["宫词"],
  "秋夜寄邱员外": ["秋夜寄丘二十二员外"],
  "近试上张水部": ["近试上张籍水部"],
  "寄扬州韩绰判官": ["寄扬州韩判官"],
  "经邹鲁祭孔子而叹之": ["经鲁祭孔子而叹之", "经邹鲁祭孔子而叹之"],
  "题破山寺后禅院": ["题破山寺后禅院后禅院"],
  "早秋": ["早秋三首 一"],
  "秋日登吴公台上寺远眺": ["秋日登吴公台上寺远眺寺即陈将吴明彻战场"],
  "送李中丞归汉阳别业": ["送李中丞之襄州"],
  "阙题": ["阙题二首 一", "阙题"],
  "望月有感": ["自河南经乱关内阻饥兄弟离散各在一处因望月有感聊书所怀寄上浮梁大兄於潜七兄乌江十五兄兼示符离及下邽弟妹"],
  "无题·凤尾香罗薄几重": ["无题", "无题二首 一"],
  "琵琶行": ["琵琶引"],
  "走马川行奉送封大夫出师": ["走马川行奉送出师西征"],
  "长信秋词五首·其三": ["相和歌辞 长信怨 二"],
  "长相思·其一": ["长相思"],
  "长相思·其二": ["长相思"],
  "金缕衣": ["杂曲歌辞 金缕衣"],
  "烈女操": ["列女操"],
  "燕歌行": ["相和歌辞 燕歌行"],
  "清平调·其二": ["清平调词三首 二", "清平调 二"],
  "清平调·其三": ["清平调 三", "清平调词三首 三"],
  "凉州词": ["横吹曲辞 出塞", "凉州词二首 一"],
  "近试上张籍水部": ["近试上张水部"],
  "送李端": ["送李端"],
  "宫词": ["宫词", "宫词五首 二", "宫词二首 一"],
  "无题·凤尾香罗薄几重": ["无题", "无题二首 一", "无题·凤尾香罗薄几重"],
};

const AUTHOR_ALIASES: Record<string, string[]> = {
  "不详": ["佚名"],
  "佚名": ["不详"],
  "刘眘虚": ["刘昚虚"],
  "刘昚虚": ["刘眘虚"],
  "朱庆余": ["朱庆馀"],
  "朱庆馀": ["朱庆余"],
};

export type CatalogEntry = {
  author: string;
  detailPath: string;
  title: string;
};

export type DetailPayload = {
  ajaxId: string | null;
  author: string;
  idStr: string;
  idjm: string | null;
  lines: string[];
  title: string;
};

export type TranslationAnnotation = {
  annotation: string | null;
  translation: string | null;
};

export type PoetryMatchCandidate = {
  author: string;
  id: string;
  lines: string[];
  sourceUid: string | null;
  title: string;
};

export type NormalizedFallbackPoetry = {
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

export function normalizeText(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function normalizeAuthor(value: string) {
  return normalizeText(value);
}

export function normalizeLineForMatch(value: string) {
  return value
    .replace(/[（(][^)）]*[)）]/g, "")
    .replace(/[\u3001\u3002\uff0c\uff01\uff1f\uff1b\uff1a,.!?;:\s]/g, "")
    .trim();
}

function authorMatches(candidateAuthor: string, detailAuthor: string) {
  const normalizedCandidate = normalizeAuthor(candidateAuthor);
  const normalizedDetail = normalizeAuthor(detailAuthor);

  if (normalizedCandidate === normalizedDetail) {
    return true;
  }

  return (AUTHOR_ALIASES[normalizedDetail] ?? []).some(
    (alias) => normalizeAuthor(alias) === normalizedCandidate,
  );
}

function toNormalizedPoemBody(lines: string[]) {
  return lines.map(normalizeLineForMatch).join("");
}

function calculateLineSimilarity(source: string, candidate: string) {
  if (!source || !candidate) {
    return 0;
  }

  const maxLength = Math.max(source.length, candidate.length);
  let sameCount = 0;

  for (let index = 0; index < Math.min(source.length, candidate.length); index += 1) {
    if (source[index] === candidate[index]) {
      sameCount += 1;
    }
  }

  return sameCount / maxLength;
}

function splitLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractCatalogEntries(html: string): CatalogEntry[] {
  const $ = cheerio.load(html);
  const entries: CatalogEntry[] = [];

  $("div.typecont span").each((_index, element) => {
    const link = $(element).find('a[href^="/shiwenv_"]').first();
    const detailPath = link.attr("href")?.trim();
    const title = normalizeText(link.text());
    const text = normalizeText($(element).text());
    const authorMatch = text.match(/\(([^()]+)\)$/);
    const author = normalizeText(authorMatch?.[1] ?? "");

    if (!detailPath || !title || !author) {
      return;
    }

    entries.push({
      author,
      detailPath,
      title,
    });
  });

  return entries;
}

export function extractDetailPayload(html: string, detailPath: string): DetailPayload {
  const $ = cheerio.load(html);
  const title = normalizeText($("#sonsyuanwen h1").first().text());
  const author = normalizeText($("#sonsyuanwen p.source a").first().text());

  const linesHtml = $("#sonsyuanwen .contson").first().html() ?? "";
  const lineText = cheerio
    .load(`<div>${linesHtml.replace(/<br\s*\/?>/gi, "\n")}</div>`)("div")
    .text();
  const lines = splitLines(lineText);

  const idStrFromPath = detailPath.match(/shiwenv_([a-f0-9]+)\.aspx/i)?.[1] ?? "";
  const fanyiMatch = html.match(
    /fanyiShow\((\d+),'([^']+)','([^']+)'\)|fanyiShow\((\d+),'([^']+)'\)/,
  );

  const ajaxId = fanyiMatch?.[1] ?? fanyiMatch?.[4] ?? null;
  const idjm = fanyiMatch?.[2] ?? fanyiMatch?.[5] ?? null;
  const idStr = fanyiMatch?.[3] ?? idStrFromPath;

  if (!title || !author || lines.length === 0 || !idStr) {
    throw new Error(`Failed to extract detail payload for ${detailPath}`);
  }

  return {
    ajaxId,
    author,
    idStr,
    idjm,
    lines,
    title,
  };
}

export function parseTranslationAnnotation(html: string): TranslationAnnotation {
  const $ = cheerio.load(html);
  const blocks = $(".contyishang p");
  let translation: string | null = null;
  let annotation: string | null = null;
  let currentLabel: "translation" | "annotation" | null = null;

  blocks.each((_index, element) => {
    const cloned = $(element).clone();
    cloned.find("a").remove();
    const strongLabel = cloned.find("strong").first().text().trim();
    cloned.find("strong").remove();
    const rawHtml = cloned.html()?.replace(/<br\s*\/?>/gi, "\n") ?? "";
    const text = cheerio.load(`<div>${rawHtml}</div>`)("div").text().trim();
    const plainText = text.replace(/\s+/g, "");
    const label = strongLabel || plainText;

    if (label === "译文" || label === "韵译" || label === "直译" || label === "散译") {
      currentLabel = "translation";
      if (strongLabel) {
        translation = text || null;
      }
      return;
    }

    if (label === "注释" || label === "注解") {
      currentLabel = "annotation";
      if (strongLabel) {
        annotation = text || null;
      }
      return;
    }

    if (currentLabel === "translation" && plainText.length > 0) {
      translation = translation ? `${translation}\n${text}` : text;
      return;
    }

    if (currentLabel === "annotation" && plainText.length > 0) {
      annotation = text || null;
    }
  });

  return {
    annotation,
    translation,
  };
}

export function matchDetailToPoetry(
  detail: DetailPayload,
  candidates: PoetryMatchCandidate[],
) {
  const normalizedTitle = normalizeText(detail.title);
  const normalizedAliasTitles = (TITLE_ALIASES[detail.title] ?? []).map(normalizeText);
  const normalizedLines = detail.lines.map(normalizeLineForMatch);
  const normalizedBody = toNormalizedPoemBody(detail.lines);
  const authorCandidates = candidates.filter((candidate) => authorMatches(candidate.author, detail.author));
  const titleCandidates = candidates.filter((candidate) => {
    const candidateTitle = normalizeText(candidate.title);
    return candidateTitle === normalizedTitle || normalizedAliasTitles.includes(candidateTitle);
  });

  const sourceUidMatch = authorCandidates.find((candidate) => candidate.sourceUid === detail.idStr);
  if (sourceUidMatch) {
    return sourceUidMatch.id;
  }

  const exactTitleMatch = authorCandidates.find((candidate) => {
    const candidateTitle = normalizeText(candidate.title);
    return candidateTitle === normalizedTitle || normalizedAliasTitles.includes(candidateTitle);
  });
  if (exactTitleMatch) {
    return exactTitleMatch.id;
  }

  const fullBodyMatch = authorCandidates.find((candidate) => {
    return toNormalizedPoemBody(candidate.lines) === normalizedBody;
  });
  if (fullBodyMatch) {
    return fullBodyMatch.id;
  }

  const titleBodyMatch = titleCandidates.find((candidate) => {
    return toNormalizedPoemBody(candidate.lines) === normalizedBody;
  });
  if (titleBodyMatch) {
    return titleBodyMatch.id;
  }

  if (titleCandidates.length === 1) {
    return titleCandidates[0].id;
  }

  const globalLineMatches = candidates.filter((candidate) => {
    const candidateLines = candidate.lines.map(normalizeLineForMatch);
    return candidateLines.length === normalizedLines.length
      && candidateLines.every((line, index) => line === normalizedLines[index]);
  });

  if (globalLineMatches.length === 1) {
    return globalLineMatches[0].id;
  }

  const lineMatches = authorCandidates.filter((candidate) => {
    const candidateLines = candidate.lines.map(normalizeLineForMatch);
    return candidateLines.length === normalizedLines.length
      && candidateLines.every((line, index) => line === normalizedLines[index]);
  });

  if (lineMatches.length === 1) {
    return lineMatches[0].id;
  }

  if (lineMatches.length > 1) {
    const titleContainsMatch = lineMatches.find((candidate) => {
      const candidateTitle = normalizeText(candidate.title);
      return (
        candidateTitle.includes(normalizedTitle)
        || normalizedTitle.includes(candidateTitle)
        || normalizedAliasTitles.some((alias) => candidateTitle.includes(alias) || alias.includes(candidateTitle))
      );
    });

    if (titleContainsMatch) {
      return titleContainsMatch.id;
    }
  }

  const fuzzyMatches = authorCandidates
    .map((candidate) => {
      const candidateLines = candidate.lines.map(normalizeLineForMatch);
      if (candidateLines.length !== normalizedLines.length) {
        return { candidate, score: 0 };
      }

      const scores = candidateLines.map((line, index) =>
        calculateLineSimilarity(normalizedLines[index] ?? "", line),
      );

      return {
        candidate,
        score: scores.reduce((sum, value) => sum + value, 0) / scores.length,
      };
    })
    .filter((item) => item.score >= 0.8)
    .sort((left, right) => right.score - left.score);

  if (fuzzyMatches.length > 0) {
    return fuzzyMatches[0].candidate.id;
  }

  const fuzzyTitleMatches = titleCandidates
    .map((candidate) => {
      const candidateBody = toNormalizedPoemBody(candidate.lines);
      if (!candidateBody || !normalizedBody) {
        return { candidate, score: 0 };
      }

      let sameCount = 0;
      for (let index = 0; index < Math.min(candidateBody.length, normalizedBody.length); index += 1) {
        if (candidateBody[index] === normalizedBody[index]) {
          sameCount += 1;
        }
      }

      return {
        candidate,
        score: sameCount / Math.max(candidateBody.length, normalizedBody.length),
      };
    })
    .filter((item) => item.score >= 0.72)
    .sort((left, right) => right.score - left.score);

  if (
    fuzzyTitleMatches.length === 1
    || (
      fuzzyTitleMatches.length > 1
      && fuzzyTitleMatches[0].score - fuzzyTitleMatches[1].score >= 0.08
    )
  ) {
    return fuzzyTitleMatches[0]?.candidate.id ?? null;
  }

  return null;
}

export function findNormalizedFallbackPoetry(
  detail: DetailPayload,
  candidates: NormalizedFallbackPoetry[],
) {
  const normalizedTitle = normalizeText(detail.title);
  const normalizedAliasTitles = (TITLE_ALIASES[detail.title] ?? []).map(normalizeText);
  const normalizedLines = detail.lines.map(normalizeLineForMatch);
  const normalizedBody = toNormalizedPoemBody(detail.lines);
  const authorCandidates = candidates.filter((candidate) => authorMatches(candidate.author, detail.author));
  const titleCandidates = candidates.filter((candidate) => {
    const candidateTitle = normalizeText(candidate.title);
    return candidateTitle === normalizedTitle || normalizedAliasTitles.includes(candidateTitle);
  });

  const sourceUidMatch = authorCandidates.find((candidate) => candidate.sourceUid === detail.idStr);
  if (sourceUidMatch) {
    return sourceUidMatch;
  }

  const exactTitleMatch = authorCandidates.find((candidate) => {
    const candidateTitle = normalizeText(candidate.title);
    return candidateTitle === normalizedTitle || normalizedAliasTitles.includes(candidateTitle);
  });
  if (exactTitleMatch) {
    return exactTitleMatch;
  }

  const fullBodyMatch = authorCandidates.find((candidate) => {
    return toNormalizedPoemBody(candidate.lines) === normalizedBody;
  });
  if (fullBodyMatch) {
    return fullBodyMatch;
  }

  const titleBodyMatch = titleCandidates.find((candidate) => {
    return toNormalizedPoemBody(candidate.lines) === normalizedBody;
  });
  if (titleBodyMatch) {
    return titleBodyMatch;
  }

  if (titleCandidates.length === 1) {
    return titleCandidates[0];
  }

  const lineMatches = authorCandidates.filter((candidate) => {
    const candidateLines = candidate.lines.map(normalizeLineForMatch);
    return candidateLines.length === normalizedLines.length
      && candidateLines.every((line, index) => line === normalizedLines[index]);
  });

  if (lineMatches.length === 1) {
    return lineMatches[0];
  }

  if (lineMatches.length > 1) {
    const titleContainsMatch = lineMatches.find((candidate) => {
      const candidateTitle = normalizeText(candidate.title);
      return (
        candidateTitle.includes(normalizedTitle)
        || normalizedTitle.includes(candidateTitle)
        || normalizedAliasTitles.some((alias) => candidateTitle.includes(alias) || alias.includes(candidateTitle))
      );
    });

    if (titleContainsMatch) {
      return titleContainsMatch;
    }
  }

  const fuzzyMatches = authorCandidates
    .map((candidate) => {
      const candidateLines = candidate.lines.map(normalizeLineForMatch);
      if (candidateLines.length !== normalizedLines.length) {
        return { candidate, score: 0 };
      }

      const scores = candidateLines.map((line, index) =>
        calculateLineSimilarity(normalizedLines[index] ?? "", line),
      );

      return {
        candidate,
        score: scores.reduce((sum, value) => sum + value, 0) / scores.length,
      };
    })
    .filter((item) => item.score >= 0.8)
    .sort((left, right) => right.score - left.score);

  return fuzzyMatches[0]?.candidate ?? null;
}
