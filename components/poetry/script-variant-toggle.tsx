"use client";

import { useEffect, useState, useTransition } from "react";

import {
  DEFAULT_SCRIPT_VARIANT,
  getScriptVariantLabel,
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
  SCRIPT_VARIANT_LOCAL_STORAGE_KEY,
  type ScriptVariant,
} from "@/lib/poetry/script-variant";

type ScriptVariantToggleProps = {
  initialVariant: ScriptVariant;
};

function writeCookie(variant: ScriptVariant) {
  document.cookie = `${SCRIPT_VARIANT_COOKIE_NAME}=${variant}; path=/; max-age=31536000; samesite=lax`;
}

export function ScriptVariantToggle({
  initialVariant,
}: ScriptVariantToggleProps) {
  const [variant, setVariant] = useState<ScriptVariant>(initialVariant);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${SCRIPT_VARIANT_COOKIE_NAME}=`))
      ?.split("=")[1];
    const nextVariant = resolveScriptVariant(cookieValue);

    setVariant(nextVariant);
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

  return (
    <button
      type="button"
      onClick={toggleVariant}
      className="rounded-full border border-[var(--color-line)] bg-white/80 px-4 py-2 text-sm text-[var(--color-ink)]"
      aria-label={`切换到${variant === "zh-Hans" ? "繁体" : "简体"}`}
      disabled={isPending}
    >
      {getScriptVariantLabel(variant)} · 切换
    </button>
  );
}
