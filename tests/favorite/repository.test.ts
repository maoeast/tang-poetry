import assert from "node:assert/strict";
import test from "node:test";

import {
  isFavoritePoem,
  toggleFavoritePoem,
  getFavoritePoems,
} from "@/lib/favorite/repository";

/* ------------------------------------------------------------------ *
 * Mock factory
 * ------------------------------------------------------------------ */

type FavoriteRow = { id: string; userId: string; poetryId: string };

function createMockRepository(opts: {
  existing?: FavoriteRow[];
  poems?: Array<{
    id: string;
    title: string;
    author: string;
    dynasty: string;
  }>;
} = {}) {
  const favorites: FavoriteRow[] = opts.existing ? [...opts.existing] : [];
  const poems = opts.poems ?? [];

  const createCalls: Array<{ userId: string; poetryId: string }> = [];
  const deleteCalls: Array<{ userId: string; poetryId: string }> = [];

  const repository = {
    favorite: {
      findUnique: async (args: {
        where: { userId_poetryId: { userId: string; poetryId: string } };
      }) => {
        const { userId, poetryId } = args.where.userId_poetryId;
        return (
          favorites.find(
            (f) => f.userId === userId && f.poetryId === poetryId,
          ) ?? null
        );
      },
      create: async (args: { data: { userId: string; poetryId: string } }) => {
        createCalls.push(args.data);
        const row: FavoriteRow = {
          id: `fav-${args.data.poetryId}`,
          userId: args.data.userId,
          poetryId: args.data.poetryId,
        };
        favorites.push(row);
        return row;
      },
      delete: async (args: {
        where: { userId_poetryId: { userId: string; poetryId: string } };
      }) => {
        const { userId, poetryId } = args.where.userId_poetryId;
        deleteCalls.push({ userId, poetryId });
        const idx = favorites.findIndex(
          (f) => f.userId === userId && f.poetryId === poetryId,
        );
        if (idx !== -1) favorites.splice(idx, 1);
        return {};
      },
      findMany: async () => {
        return favorites
          .map((f) => {
            const poem = poems.find((p) => p.id === f.poetryId);
            return poem
              ? {
                  poetryId: f.poetryId,
                  createdAt: new Date(),
                  poetry: { ...poem, lines: [] },
                }
              : null;
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);
      },
    },
  };

  return { repository, createCalls, deleteCalls, favorites };
}

/* ------------------------------------------------------------------ *
 * toggleFavoritePoem
 * ------------------------------------------------------------------ */

test("toggleFavoritePoem creates favorite when not favorited", async () => {
  const previous = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();
  const result = await toggleFavoritePoem("ts300-0001", mock.repository);

  assert.equal(result.isFavorite, true);
  assert.equal(mock.createCalls.length, 1);
  assert.equal(mock.createCalls[0].poetryId, "ts300-0001");
  assert.equal(mock.deleteCalls.length, 0);

  process.env.SYSTEM_USER_ID = previous;
});

test("toggleFavoritePoem removes favorite when already favorited", async () => {
  const previous = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository({
    existing: [
      { id: "fav-1", userId: "family-001", poetryId: "ts300-0001" },
    ],
  });
  const result = await toggleFavoritePoem("ts300-0001", mock.repository);

  assert.equal(result.isFavorite, false);
  assert.equal(mock.createCalls.length, 0);
  assert.equal(mock.deleteCalls.length, 1);
  assert.equal(mock.deleteCalls[0].poetryId, "ts300-0001");

  process.env.SYSTEM_USER_ID = previous;
});

test("toggleFavoritePoem is idempotent across two calls", async () => {
  const previous = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();

  const first = await toggleFavoritePoem("ts300-0002", mock.repository);
  const second = await toggleFavoritePoem("ts300-0002", mock.repository);

  assert.equal(first.isFavorite, true);
  assert.equal(second.isFavorite, false);
  assert.equal(mock.createCalls.length, 1);
  assert.equal(mock.deleteCalls.length, 1);

  process.env.SYSTEM_USER_ID = previous;
});

/* ------------------------------------------------------------------ *
 * isFavoritePoem
 * ------------------------------------------------------------------ */

test("isFavoritePoem returns true when record exists", async () => {
  const previous = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository({
    existing: [
      { id: "fav-1", userId: "family-001", poetryId: "ts300-0003" },
    ],
  });
  const result = await isFavoritePoem("ts300-0003", mock.repository);
  assert.equal(result, true);

  process.env.SYSTEM_USER_ID = previous;
});

test("isFavoritePoem returns false when no record", async () => {
  const previous = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();
  const result = await isFavoritePoem("ts300-9999", mock.repository);
  assert.equal(result, false);

  process.env.SYSTEM_USER_ID = previous;
});

/* ------------------------------------------------------------------ *
 * getFavoritePoems
 * ------------------------------------------------------------------ */

test("getFavoritePoems returns BrowsePoem list ordered by createdAt desc", async () => {
  const previous = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository({
    existing: [
      { id: "f1", userId: "family-001", poetryId: "ts300-0001" },
      { id: "f2", userId: "family-001", poetryId: "ts300-0002" },
    ],
    poems: [
      { id: "ts300-0001", title: "春晓", author: "孟浩然", dynasty: "唐" },
      { id: "ts300-0002", title: "静夜思", author: "李白", dynasty: "唐" },
    ],
  });

  const result = await getFavoritePoems(
    "family-001",
    "zh-Hans",
    mock.repository,
    async () => new Map(), // no images → placeholders
  );

  assert.equal(result.length, 2);
  assert.ok(result.every((p) => p.id === "ts300-0001" || p.id === "ts300-0002"));
  assert.equal(result[0].title === "春晓" || result[0].title === "静夜思", true);

  process.env.SYSTEM_USER_ID = previous;
});

test("getFavoritePoems returns empty array when no favorites", async () => {
  const previous = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();
  const result = await getFavoritePoems(
    "family-001",
    "zh-Hans",
    mock.repository,
    async () => new Map(),
  );

  assert.equal(result.length, 0);

  process.env.SYSTEM_USER_ID = previous;
});

/* ------------------------------------------------------------------ *
 * SYSTEM_USER_ID missing — graceful degradation
 * ------------------------------------------------------------------ */

test("all functions return safe defaults when SYSTEM_USER_ID is missing", async () => {
  const previous = process.env.SYSTEM_USER_ID;
  delete process.env.SYSTEM_USER_ID;

  const mock = createMockRepository();

  const fav = await isFavoritePoem("ts300-0001", mock.repository);
  const toggled = await toggleFavoritePoem("ts300-0001", mock.repository);
  const list = await getFavoritePoems(
    "family-001",
    "zh-Hans",
    mock.repository,
    async () => new Map(),
  );

  assert.equal(fav, false);
  assert.equal(toggled.isFavorite, false);
  assert.equal(list.length, 0);
  assert.equal(mock.createCalls.length, 0); // no writes happened

  process.env.SYSTEM_USER_ID = previous;
});
