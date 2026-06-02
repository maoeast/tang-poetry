type PosterStatusBadgeProps = {
  label: string;
  tone?: "neutral" | "ready" | "placeholder";
};

const toneClassName: Record<NonNullable<PosterStatusBadgeProps["tone"]>, string> = {
  neutral:
    "border-white/30 bg-black/40 text-white shadow-[0_1px_4px_rgba(0,0,0,0.3)]",
  ready:
    "border-emerald-300/80 bg-emerald-50/95 text-emerald-900 shadow-[0_1px_6px_rgba(0,0,0,0.15)]",
  placeholder:
    "border-amber-300/80 bg-amber-50/95 text-amber-900 shadow-[0_1px_6px_rgba(0,0,0,0.15)]",
};

export function PosterStatusBadge({
  label,
  tone = "neutral",
}: PosterStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase backdrop-blur-sm ${toneClassName[tone]}`}
    >
      {label}
    </span>
  );
}
