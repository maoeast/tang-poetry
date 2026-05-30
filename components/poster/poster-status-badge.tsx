type PosterStatusBadgeProps = {
  label: string;
  tone?: "neutral" | "ready" | "placeholder";
};

const toneClassName: Record<NonNullable<PosterStatusBadgeProps["tone"]>, string> = {
  neutral: "border-white/30 bg-white/18 text-white",
  ready: "border-emerald-200/70 bg-emerald-50/90 text-emerald-900",
  placeholder: "border-amber-200/80 bg-amber-50/92 text-amber-900",
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
