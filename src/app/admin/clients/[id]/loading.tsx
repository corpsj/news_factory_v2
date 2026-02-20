export default function ClientDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-28 rounded-md bg-white/[0.08]" />

      <div className="space-y-2">
        <div className="h-9 w-64 rounded-md bg-white/[0.08]" />
        <div className="h-4 w-80 max-w-full rounded-md bg-white/[0.06]" />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="h-3 w-16 rounded bg-white/[0.08]" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="h-10 rounded-lg bg-white/[0.05]" />
          <div className="h-10 rounded-lg bg-white/[0.05]" />
          <div className="h-10 rounded-lg bg-white/[0.05]" />
          <div className="h-10 rounded-lg bg-white/[0.05]" />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="h-3 w-14 rounded bg-white/[0.08]" />
        <div className="mt-4 h-8 w-56 rounded bg-white/[0.05]" />
        <div className="mt-2 h-4 w-64 max-w-full rounded bg-white/[0.05]" />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="h-3 w-20 rounded bg-white/[0.08]" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="h-20 rounded-lg bg-white/[0.05]" />
          <div className="h-20 rounded-lg bg-white/[0.05]" />
          <div className="h-20 rounded-lg bg-white/[0.05]" />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="h-3 w-12 rounded bg-white/[0.08]" />
        <div className="mt-4 h-9 w-24 rounded-lg bg-white/[0.05]" />
      </div>
    </div>
  );
}
