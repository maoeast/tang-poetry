/**
 * Favorite poem repository — toggle, query, and list favorites.
 *
 * Phase 1 uses a fixed SYSTEM_USER_ID (no User model). All functions
 * degrade gracefully when SYSTEM_USER_ID is unset (return safe defaults,
 * perform no writes).
 */

import { db } from "@/lib/db";
import type { BrowsePoem } from "@/lib/browse/repository";
import type { PoetryImage } from "@/lib/images/repository";
import {
  getAllPoetryImages,
  getPlaceholderImage,
} from "@/lib/images/repository";
import { pickPoetryContentVariant } from "@/lib/poetry/script-variant";
import type { ScriptVariant } from "@/lib/poetry/script-variant";

/* ------------------------------------------------------------------ *
 * Repository type (structural — matches only the Prisma methods used)
 * ------------------------------------------------------------------ */

export type FavoriteWithPoetry = {
  poetryId: string;
  createdAt: Date;
  poetry: {
    id: string;
    title: string;
    author: string;
    dynasty: string;
    lines: unknown;
    titleZhHans?: string | null;
    titleZhHant?: string | null;
    authorZhHans?: string | null;
    authorZhHant?: string | null;
  };
};

export type FavoriteRepository = {
  favorite?: {
    findUnique: (args: {
      where: { userId_poetryId: { userId: string; poetryId: string } };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
    create: (args: {
      data: { userId: string; poetryId: string };
    }) => Promise<{ id: string }>;
    delete: (args: {
      where: { userId_poetryId: { userId: string; poetryId: string } };
    }) => Promise<unknown>;
    findMany: (args: {
      where: { userId: string };
      orderBy: { createdAt: "desc" };
      include: { poetry: boolean };
    }) => Promise<FavoriteWithPoetry[]>;
  };
};

/** Image provider — injected so tests can stub image lookups. */
export type ImageProvider = () => Promise<Map<string, PoetryImage>>;

/* ------------------------------------------------------------------ *
 * isFavoritePoem — check if a poem is in the user's favorites
 * ------------------------------------------------------------------ */

export async function isFavoritePoem(
  poetryId: string,
  repository?: FavoriteRepository,
): Promise<boolean> {
  const userId = process.env.SYSTEM_USER_ID;
  if (!userId) return false;

  const repo = repository ?? (db as unknown as FavoriteRepository);
  if (!repo.favorite) return false;

  const record = await repo.favorite.findUnique({
    where: { userId_poetryId: { userId, poetryId } },
    select: { id: true },
  });

  return Boolean(record);
}

/* ------------------------------------------------------------------ *
 * toggleFavoritePoem — add if absent, remove if present (idempotent)
 * ------------------------------------------------------------------ */

export async function toggleFavoritePoem(
  poetryId: string,
  repository?: FavoriteRepository,
): Promise<{ isFavorite: boolean }> {
  const userId = process.env.SYSTEM_USER_ID;
  if (!userId) return { isFavorite: false };

  const repo = repository ?? (db as unknown as FavoriteRepository);
  if (!repo.favorite) return { isFavorite: false };

  const existing = await repo.favorite.findUnique({
    where: { userId_poetryId: { userId, poetryId } },
    select: { id: true },
  });

  if (existing) {
    await repo.favorite.delete({
      where: { userId_poetryId: { userId, poetryId } },
    });
    return { isFavorite: false };
  }

  await repo.favorite.create({
    data: { userId, poetryId },
  });
  return { isFavorite: true };
}

/* ------------------------------------------------------------------ *
 * getFavoritePoems — list favorited poems as BrowsePoem[] for display
 * ------------------------------------------------------------------ */

export async function getFavoritePoems(
  userId: string,
  scriptVariant: ScriptVariant,
  repository?: FavoriteRepository,
  imageProvider?: ImageProvider,
): Promise<BrowsePoem[]> {
  const repo = repository ?? (db as unknown as FavoriteRepository);
  const getImages = imageProvider ?? (() => getAllPoetryImages());

  if (!repo.favorite) return [];

  const [favorites, imageMap] = await Promise.all([
    repo.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { poetry: true },
    }),
    getImages(),
  ]);

  return favorites.map((fav) => {
    const variant = pickPoetryContentVariant(fav.poetry, scriptVariant);
    const image = imageMap.get(fav.poetryId) ?? getPlaceholderImage(fav.poetryId);

    return {
      id: fav.poetryId,
      title: variant.title,
      author: variant.author,
      dynasty: fav.poetry.dynasty,
      image,
    };
  });
}
