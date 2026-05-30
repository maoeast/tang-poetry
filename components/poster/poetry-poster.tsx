import Image from "next/image";
import type { ReactNode } from "react";

type PoetryPosterProps = {
  imageSrc: string;
  imageAlt: string;
  priority?: boolean;
  overlay?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  sizes?: string;
  isPlaceholder?: boolean;
};

export function PoetryPoster({
  imageSrc,
  imageAlt,
  priority = false,
  overlay,
  badge,
  children,
  sizes = "(min-width: 1024px) 480px, 100vw",
  isPlaceholder = false,
}: PoetryPosterProps) {
  return (
    <div className="w-full max-w-[480px]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-accent-soft)] shadow-[var(--shadow-soft)]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />

        {isPlaceholder ? (
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(63,47,35,0.18))]" />
        ) : null}

        {badge ? <div className="absolute left-4 top-4 z-10">{badge}</div> : null}
        {children ? (
          <div className="absolute inset-x-0 bottom-0 z-10">{children}</div>
        ) : null}
        {overlay ? <div className="absolute inset-0 z-0">{overlay}</div> : null}
      </div>
    </div>
  );
}
