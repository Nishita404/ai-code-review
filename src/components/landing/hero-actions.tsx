export function HeroActions() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href="#get-started"
        className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
      >
        Start reviewing
      </a>
      <a
        href="#learn-more"
        className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        See workflow
      </a>
    </div>
  );
}