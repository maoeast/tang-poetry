import Link from "next/link";
import { cookies } from "next/headers";

import { CategorySection } from "@/components/browse/category-section";
import { StickyCategoryNav } from "@/components/browse/sticky-category-nav";
import { getPoetryByCategories } from "@/lib/browse/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );
  const categories = await getPoetryByCategories(scriptVariant);

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
            诗歌分类
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink-600">
            按诗歌体裁浏览全部
            366首唐诗，从五言绝句到乐府诗，每一种形式都有独特的韵味。点击任意一首即可查看全文与配图。
          </p>
          {/* 淡墨分割线 — 不贯穿全屏的优雅过渡 */}
          <div className="mt-10 h-px w-24 bg-ink-200/60" />
        </section>
      </div>

      {/* ── Sticky nav — full-bleed, CSS sticky 吸顶 ── */}
      <div className="sticky top-0 z-50 border-b border-ink-200/40 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-3 sm:px-10">
          <StickyCategoryNav items={navItems} />
        </div>
      </div>

      {/* ── Category sections ── */}
      <div className="mx-auto mt-10 w-full max-w-6xl">
        {categories.map((category) => (
          <CategorySection key={category.tag} category={category} />
        ))}
      </div>
    </main>
  );
}
