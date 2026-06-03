import Link from "next/link";
import { cookies } from "next/headers";

import { CategorySection } from "@/components/browse/category-section";
import { PoetryCard } from "@/components/browse/poetry-card";
import { SearchInput } from "@/components/browse/search-input";
import { StickyCategoryNav } from "@/components/browse/sticky-category-nav";
import {
  getPoetryByCategories,
  searchPoems,
} from "@/lib/browse/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );

  const query = q?.trim() ?? "";
  const isSearching = query.length > 0;

  const [categories, results] = await Promise.all([
    getPoetryByCategories(scriptVariant),
    isSearching ? searchPoems(query, scriptVariant) : Promise.resolve([]),
  ]);

  const navItems = categories.map((c) => ({ tag: c.tag, label: c.label }));

  return (
    <main className="min-h-screen bg-paper px-6 py-10 text-ink-900 sm:px-10">
      {/* ── Header: top bar + 去框化 hero ── */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-full border border-ink-200 bg-surface/70 px-4 py-2 text-sm text-ink-600 transition hover:bg-surface/50"
          >
            返回首页
          </Link>
          <p className="text-sm tracking-[0.24em] text-ink-600 uppercase">
            诗歌浏览
          </p>
        </div>

        {/* Hero — 去框化：直接渲染在宣纸底色上 */}
        <section className="antialiased">
          <h1 className="text-4xl font-serif tracking-[0.16em] sm:text-5xl">
            {isSearching ? "搜索结果" : "诗歌分类"}
          </h1>
          {/* 淡墨分割线 */}
          <div className="mt-10 h-px w-24 bg-ink-200/60" />
        </section>
      </div>

      {/* ── Sticky bar: category nav (left) + search (right) ── */}
      <div className="sticky top-0 z-50 border-b border-ink-200/40 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 sm:px-10">
          {!isSearching && <StickyCategoryNav items={navItems} />}
          <div className="ml-auto">
            <SearchInput />
          </div>
        </div>
      </div>

      {/* ── Content: search results or category sections ── */}
      <div className="mx-auto mt-10 w-full max-w-6xl">
        {isSearching ? (
          <>
            {/* Result summary */}
            <p className="mb-8 text-sm tracking-widest text-ink-500 font-serif">
              「{query}」— 共 {results.length} 首
            </p>

            {results.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.map((poem) => (
                  <PoetryCard key={poem.id} poem={poem} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-lg text-ink-400 font-serif tracking-widest">
                  未找到相关诗歌
                </p>
                <p className="mt-2 text-sm text-ink-300 tracking-wide">
                  试试换个关键词搜索
                </p>
              </div>
            )}
          </>
        ) : (
          categories.map((category) => (
            <CategorySection key={category.tag} category={category} />
          ))
        )}
      </div>
    </main>
  );
}
