export default function LinkedInLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton — matches the w-56 nav */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-stone-200/60 bg-stone-50 p-4">
        {/* Logo placeholder */}
        <div className="flex items-center gap-2.5 px-3 py-4 mb-6">
          <div className="h-8 w-8 rounded-xl skeleton" />
          <div className="h-4 w-24 rounded-lg skeleton" />
        </div>

        {/* Nav section placeholders */}
        {[4, 3, 4, 1].map((count, sectionIdx) => (
          <div key={sectionIdx} className="mb-5">
            <div className="h-2.5 w-16 rounded-lg skeleton mb-3 mx-3" />
            <div className="space-y-1">
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <div className="h-4 w-4 rounded-lg skeleton" />
                  <div
                    className="h-3.5 rounded-lg skeleton"
                    style={{ width: `${60 + Math.random() * 40}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Page title */}
          <div>
            <div className="h-7 w-48 rounded-xl skeleton mb-2" />
            <div className="h-4 w-64 rounded-lg skeleton" />
          </div>

          {/* Feature card skeleton */}
          <div className="rounded-2xl border border-stone-200/60 bg-white p-5 space-y-4">
            <div className="h-4 w-32 rounded-lg skeleton" />
            <div className="h-20 w-full rounded-xl skeleton" />
            <div className="flex gap-2">
              <div className="h-10 w-36 rounded-xl skeleton" />
              <div className="h-10 w-32 rounded-xl skeleton" />
            </div>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-stone-200/60 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 w-16 rounded-lg skeleton" />
                    <div className="h-6 w-12 rounded-lg skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart area skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-stone-200/60 bg-white p-5">
              <div className="h-4 w-48 rounded-lg skeleton mb-4" />
              <div className="h-[280px] w-full rounded-xl skeleton" />
            </div>
            <div className="rounded-2xl border border-stone-200/60 bg-white p-5">
              <div className="h-4 w-32 rounded-lg skeleton mb-4" />
              <div className="h-[220px] w-full rounded-xl skeleton" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
