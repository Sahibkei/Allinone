type ToolPlaceholderProps = {
  heading: string;
  details: string;
  nextMilestone: string;
};

export function ToolPlaceholder({ heading, details, nextMilestone }: ToolPlaceholderProps) {
  return (
    <div className="glass-panel rounded-3xl p-7 md:p-10">
      <h2 className="text-2xl font-bold">{heading}</h2>
      <p className="muted mt-3 max-w-3xl leading-7">{details}</p>
      <div className="surface mt-6 rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] muted">Next milestone</p>
        <p className="mt-2 text-sm">{nextMilestone}</p>
      </div>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-6 rounded-full border border-white/25 px-4 py-2 text-sm font-semibold muted"
      >
        Build in next PR
      </button>
    </div>
  );
}
