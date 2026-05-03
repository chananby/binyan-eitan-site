export default function ProjectDetailSkeleton({ dir = "ltr" }: { dir?: "ltr" | "rtl" }) {
  return (
    <div className="bg-bone min-h-screen animate-pulse" dir={dir}>
      {/* Navbar placeholder */}
      <div className="h-16 bg-bone border-b border-warm-gray-light" />

      {/* Hero */}
      <div className="relative w-full aspect-[4/3] max-h-[80vh] bg-charcoal/10" />

      {/* Breadcrumb */}
      <div className="px-6 md:px-12 py-4 border-b border-warm-gray-light">
        <div className="max-w-5xl mx-auto flex gap-2 items-center">
          <div className="h-3 w-10 bg-charcoal/10 rounded" />
          <div className="h-3 w-2 bg-charcoal/10 rounded" />
          <div className="h-3 w-16 bg-charcoal/10 rounded" />
          <div className="h-3 w-2 bg-charcoal/10 rounded" />
          <div className="h-3 w-32 bg-charcoal/15 rounded" />
        </div>
      </div>

      {/* Meta strip */}
      <div className="px-6 md:px-12 py-10 border-b border-warm-gray-light">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-2.5 w-12 bg-charcoal/10 rounded mb-2" />
              <div className="h-4 w-24 bg-charcoal/15 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Intro paragraph */}
      <div className="px-6 md:px-12 py-14">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="h-5 bg-charcoal/10 rounded w-full" />
          <div className="h-5 bg-charcoal/10 rounded w-[95%]" />
          <div className="h-5 bg-charcoal/10 rounded w-[88%]" />
          <div className="h-5 bg-charcoal/10 rounded w-[92%]" />
          <div className="h-5 bg-charcoal/10 rounded w-[70%]" />
        </div>
      </div>

      {/* Gallery grid */}
      <div className="px-6 md:px-12 py-8 bg-charcoal/5">
        <div className="max-w-6xl mx-auto">
          <div className="h-3 w-40 bg-charcoal/10 rounded mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-charcoal/10 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Challenge & Solution */}
      <div className="px-6 md:px-12 py-16 border-b border-warm-gray-light">
        <div className="max-w-5xl mx-auto grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4 space-y-3">
            <div className="h-2.5 w-24 bg-charcoal/10 rounded" />
            <div className="h-8 w-36 bg-charcoal/15 rounded" />
          </div>
          <div className="md:col-span-8 space-y-2.5">
            {[100, 97, 93, 99, 95, 88, 91, 85].map((w, i) => (
              <div key={i} className={`h-4 bg-charcoal/10 rounded`} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="px-6 md:px-12 py-16">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="h-2.5 w-16 bg-charcoal/10 rounded mb-4" />
          <div className="h-5 bg-charcoal/10 rounded w-full" />
          <div className="h-5 bg-charcoal/10 rounded w-[90%]" />
          <div className="h-5 bg-charcoal/10 rounded w-[75%]" />
        </div>
      </div>
    </div>
  );
}
