type PosterTitleBlockProps = {
  title: string;
  author: string;
  dynasty: string;
};

export function PosterTitleBlock({ title, author, dynasty }: PosterTitleBlockProps) {
  return (
    <div className="bg-gradient-to-t from-[rgba(31,24,18,0.88)] via-[rgba(31,24,18,0.62)] to-transparent px-5 pb-5 pt-12 text-white">
      <p className="text-xs tracking-[0.28em] text-white/72 uppercase">Tang Poetry</p>
      <h2 className="mt-2 text-3xl font-semibold leading-tight">{title}</h2>
      <p className="mt-2 text-sm text-white/80">
        {dynasty} · {author}
      </p>
    </div>
  );
}
