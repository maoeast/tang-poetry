export type ScriptVariant = "zh-Hans" | "zh-Hant";

export const SCRIPT_VARIANT_COOKIE_NAME = "poetry-script";
export const SCRIPT_VARIANT_LOCAL_STORAGE_KEY = "poetry-script";
export const DEFAULT_SCRIPT_VARIANT: ScriptVariant = "zh-Hans";

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function resolveScriptVariant(value?: string | null): ScriptVariant {
  return value === "zh-Hant" ? "zh-Hant" : DEFAULT_SCRIPT_VARIANT;
}

export function getScriptVariantLabel(variant: ScriptVariant) {
  return variant === "zh-Hant" ? "繁体" : "简体";
}

type VariantContentSource = {
  title: string;
  author: string;
  lines: unknown;
  titleOriginal?: string | null;
  authorOriginal?: string | null;
  titleZhHans?: string | null;
  titleZhHant?: string | null;
  authorZhHans?: string | null;
  authorZhHant?: string | null;
  linesZhHans?: unknown;
  linesZhHant?: unknown;
};

export function pickPoetryContentVariant(
  source: VariantContentSource,
  variant: ScriptVariant,
) {
  if (variant === "zh-Hant") {
    return {
      title: source.titleZhHant ?? source.titleOriginal ?? source.title,
      author: source.authorZhHant ?? source.authorOriginal ?? source.author,
      lines: toStringArray(source.linesZhHant).length > 0
        ? toStringArray(source.linesZhHant)
        : toStringArray(source.lines),
    };
  }

  return {
    title: source.titleZhHans ?? source.title,
    author: source.authorZhHans ?? source.author,
    lines: toStringArray(source.linesZhHans).length > 0
      ? toStringArray(source.linesZhHans)
      : toStringArray(source.lines),
  };
}
