import { unlockApp } from "./actions";

type UnlockPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function UnlockPage({ searchParams }: UnlockPageProps) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/";
  const hasError = params.error === "invalid";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] border border-ink-200 bg-surface p-8 shadow-[var(--shadow-panel)] backdrop-blur">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold">输入访问口令</h1>
          <p className="text-sm leading-7 text-ink-600">
            请输入口令以进入诗笺阁。
          </p>
        </div>

        <form action={unlockApp} className="mt-8 space-y-5">
          <input type="hidden" name="next" value={nextPath} />

          <label className="block space-y-2">
            <span className="text-sm font-medium">访问口令</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-ink-200 bg-surface/80 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-[rgba(185,130,70,0.16)]"
              placeholder="请输入口令"
              required
            />
          </label>

          {hasError ? (
            <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent">
              口令不正确，请再试一次。
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:brightness-105"
          >
            进入应用
          </button>
        </form>
      </section>
    </main>
  );
}
