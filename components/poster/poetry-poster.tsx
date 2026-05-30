import Image from "next/image";
import type { ReactNode } from "react";

export type PoetryPosterVariant = "hero" | "immersive" | "review" | "thumbnail" | "banner";

export type PoetryPosterProps = {
  variant: PoetryPosterVariant;
  imageSrc: string;
  imageAlt: string;
  isPlaceholder: boolean;
  priority?: boolean;
  overlay?: ReactNode;
  badge?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function PoetryPoster({
  variant,
  imageSrc,
  imageAlt,
  isPlaceholder,
  priority = false,
  overlay,
  badge,
  className,
  children,
}: PoetryPosterProps) {
  return (
    <div className={`w-full max-w-[480px] ${className ?? ""}`} data-variant={variant}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-accent-soft)] shadow-[var(--shadow-soft)]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 480px, 100vw"
          className="object-cover"
        />

        {isPlaceholder ? (
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(63,47,35,0.18))]" />
        ) : null}

        {badge ? <div className="absolute left-4 top-4 z-10">{badge}</div> : null}
        {overlay ? <div className="absolute inset-0 z-0">{overlay}</div> : null}
        {children ? <div className="absolute inset-0 z-10">{children}</div> : null}
      </div>
    </div>
  );
}
