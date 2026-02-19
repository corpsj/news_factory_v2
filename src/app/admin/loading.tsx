export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06]" />
        <div className="mt-2 h-4 w-32 rounded-lg bg-white/[0.06]" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-white/[0.06]" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="mt-8 space-y-2">
        <div className="h-12 rounded-xl bg-white/[0.06]" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}
