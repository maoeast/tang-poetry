"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type CarouselImage = {
  imagePath: string;
  thumbPath: string | null;
  isPlaceholder: boolean;
  alt: string;
};

type ImageCarouselProps = {
  images: CarouselImage[];
  /** Auto-rotate interval in ms (default 5000). Set 0 to disable. */
  intervalMs?: number;
  /** Fade transition duration in ms (default 1200) */
  fadeDurationMs?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Minimal fade-carousel: stacks all images with CSS opacity transitions.
 * Only 2 images are mounted at any time (current + next) to keep DOM light.
 * Auto-rotates every `intervalMs` with a smooth cross-fade.
 */
export function ImageCarousel({
  images,
  intervalMs = 5000,
  fadeDurationMs = 1200,
  className,
  priority = false,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = images.length;

  const advance = useCallback(() => {
    if (count <= 1) return;
    setPreviousIndex(currentIndex);
    setCurrentIndex((prev) => (prev + 1) % count);
    setIsTransitioning(true);
  }, [count, currentIndex]);

  // Reset transition state after fade completes
  useEffect(() => {
    if (!isTransitioning) return;
    const t = setTimeout(() => {
      setIsTransitioning(false);
      setPreviousIndex(null);
    }, fadeDurationMs);
    return () => clearTimeout(t);
  }, [isTransitioning, fadeDurationMs]);

  // Auto-rotate timer
  useEffect(() => {
    if (count <= 1 || intervalMs <= 0) return;

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(advance, intervalMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [count, intervalMs, advance, currentIndex]);

  // Single image — no carousel needed
  if (count <= 1) {
    const img = images[0];
    return (
      <div className={`relative aspect-[2/3] overflow-hidden rounded-[2rem] border border-ink-200 bg-primary/10 shadow-[var(--shadow-panel)] ${className ?? ""}`}>
        <Image
          src={img.thumbPath ?? img.imagePath}
          alt={img.alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 480px, 100vw"
          className="object-cover"
        />
        {img.isPlaceholder && (
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(63,47,35,0.18))]" />
        )}
      </div>
    );
  }

  // Multiple images — cross-fade carousel
  const visibleImages: { idx: number; opacity: number; zIndex: number }[] = [];

  // Current image is always visible
  visibleImages.push({ idx: currentIndex, opacity: 1, zIndex: 2 });

  // During transition, fade out previous image
  if (isTransitioning && previousIndex !== null) {
    visibleImages.push({ idx: previousIndex, opacity: 0, zIndex: 1 });
  }

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-[2rem] border border-ink-200 bg-primary/10 shadow-[var(--shadow-panel)] ${className ?? ""}`}>
      {visibleImages.map(({ idx, opacity, zIndex }) => {
        const img = images[idx];
        return (
          <Image
            key={idx}
            src={img.thumbPath ?? img.imagePath}
            alt={img.alt}
            fill
            priority={priority && idx === 0}
            sizes="(min-width: 1024px) 480px, 100vw"
            className="object-cover"
            style={{
              opacity,
              transition: `opacity ${fadeDurationMs}ms ease-in-out`,
              zIndex,
            }}
          />
        );
      })}
      {images[0].isPlaceholder && (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(63,47,35,0.18))]" />
      )}
      {/* Image count indicator */}
      <div className="absolute bottom-3 right-3 z-[4] rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
        {currentIndex + 1}/{count}
      </div>
    </div>
  );
}
