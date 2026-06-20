"use client";

import { useEffect, useState, useTransition } from "react";

import {
  getScriptVariantLabel,
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
  SCRIPT_VARIANT_LOCAL_STORAGE_KEY,
  type ScriptVariant,
} from "@/lib/poetry/script-variant";

type ScriptVariantToggleProps = {
  initialVariant: ScriptVariant;
  /** Compact pill style for inline control bars */
  compact?: boolean;
  /** Dark background mode for immersive bars */
  dark?: boolean;
};

function writeCookie(variant: ScriptVariant) {
  document.cookie = `${SCRIPT_VARIANT_COOKIE_NAME}=${variant}; path=/; max-age=31536000; samesite=lax`;
}

export function ScriptVariantToggle({
  initialVariant,
  compact = false,
  dark = false,
}: ScriptVariantToggleProps) {
  const [variant, setVariant] = useState<ScriptVariant>(initialVariant);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${SCRIPT_VARIANT_COOKIE_NAME}=`))
      ?.split("=")[1];
    const nextVariant = resolveScriptVariant(cookieValue);

    startTransition(() => {
      setVariant(nextVariant);
    });
    localStorage.setItem(SCRIPT_VARIANT_LOCAL_STORAGE_KEY, nextVariant);
  }, []);

  function toggleVariant() {
    const nextVariant: ScriptVariant = variant === "zh-Hans" ? "zh-Hant" : "zh-Hans";

    writeCookie(nextVariant);
    localStorage.setItem(SCRIPT_VARIANT_LOCAL_STORAGE_KEY, nextVariant);

    startTransition(() => {
      setVariant(nextVariant);
      window.location.reload();
    });
  }

  const label = compact ? (variant === "zh-Hans" ? "简" : "繁") : `${getScriptVariantLabel(variant)} · 切换`;

  return (
    <button
      type="button"
      onClick={toggleVariant}
      className={
        dark
          ? "rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          : compact
            ? "rounded-full border border-ink-200 px-2.5 py-0.5 text-xs text-ink-600 transition hover:bg-surface/50 disabled:opacity-50"
            : "rounded-full border border-ink-200 bg-surface/80 px-4 py-2 text-sm text-ink-900"
      }
      aria-label={`切换到${variant === "zh-Hans" ? "繁体" : "简体"}`}
      disabled={isPending}
    >
      {label}
    </button>
  );
}
