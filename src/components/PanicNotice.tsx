export function PanicNotice({ compact = false, short, title, body }: { compact?: boolean; short?: string; title?: string; body?: string }) {
  if (compact) {
    const text = short ?? "";
    const dot = text.indexOf(".");
    const lead = dot > 0 ? text.slice(0, dot + 1) : text;
    const rest = dot > 0 ? text.slice(dot + 1) : "";
    return (
      <div className="border-b notice-amber">
        <div className="mx-auto max-w-6xl px-4 py-2.5 text-[13px] sm:text-sm flex items-start sm:items-center gap-2.5">
          <span className="mt-0.5 sm:mt-0 shrink-0" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <span>
            <strong>{lead}</strong>
            {rest}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="card p-6 notice-amber border">
      <div className="eyebrow !text-[color:var(--amber)]">Remember</div>
      <p className="text-lg font-bold mt-1 text-fg">{title}</p>
      <p className="text-sm mt-1.5 whitespace-pre-line">{body}</p>
    </div>
  );
}
