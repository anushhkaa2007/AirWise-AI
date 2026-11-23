interface LoadingStateProps {
  label?: string;
  rows?: number;
}

export function LoadingState({ label = 'Loading workspace...', rows = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-8 animate-pulse" role="status" aria-live="polite" aria-label={label}>
      <div className="rounded-3xl bg-[#102B22] p-8">
        <div className="h-3 w-40 rounded bg-white/15" />
        <div className="mt-4 h-10 w-96 max-w-full rounded bg-white/15" />
        <div className="mt-3 h-4 w-72 max-w-full rounded bg-white/10" />
        <div className="mt-8 h-11 w-44 rounded-xl bg-[#C4DC91]/25" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-3xl bg-[#EEECE3] p-8 lg:col-span-5">
          <div className="mx-auto h-48 w-48 rounded-full bg-[#A8BBA6]/25" />
        </div>
        <div className="rounded-3xl bg-[#EEECE3] p-8 lg:col-span-7">
          <div className="h-4 w-36 rounded bg-[#A8BBA6]/30" />
          <div className="mt-6 grid grid-cols-2 gap-4">
            {Array.from({ length: Math.max(rows, 2) }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-[#F7F5EF]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
