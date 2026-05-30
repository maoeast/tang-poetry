type PosterTitleBlockProps = {
  title: string;
  author: string;
  dynasty: string;
  className?: string;
};

export function PosterTitleBlock({
  title,
  author,
  dynasty,
  className,
}: PosterTitleBlockProps) {
  return (
    <div
      className={`absolute inset-x-0 top-[16%] px-5 text-white sm:px-6 ${className ?? ""}`}
    >
      <div className="max-w-[78%] rounded-[1.5rem] bg-[rgba(31,24,18,0.34)] p-4 backdrop-blur-sm">
        <p className="text-xs tracking-[0.28em] text-white/72 uppercase">Tang Poetry</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight">{title}</h2>
        <p className="mt-2 text-sm text-white/80">
        {dynasty} · {author}
        </p>
      </div>
    </div>
  );
}
