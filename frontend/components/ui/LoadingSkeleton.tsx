export function LoadingSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-slate-700/60">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 flex-1 rounded bg-slate-700/60" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 flex-1 rounded bg-slate-800/80"
              style={{ opacity: 1 - i * 0.12 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 space-y-4">
      <div className="h-5 w-1/3 rounded bg-slate-700/60" />
      <div className="space-y-2">
        <div className="h-4 rounded bg-slate-800/80" />
        <div className="h-4 w-3/4 rounded bg-slate-800/80" />
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="animate-pulse space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3.5 w-24 rounded bg-slate-700/60" />
          <div className="h-10 rounded-lg bg-slate-800/80" />
        </div>
      ))}
      <div className="h-10 w-32 rounded-lg bg-brand-600/30" />
    </div>
  );
}
