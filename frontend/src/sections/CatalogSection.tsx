export default function CatalogSection() {
  return (
    <section className="min-h-screen w-full flex items-center justify-center bg-[#f8f8f8] px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-[1400px] w-full">
        <div className="bg-[#1a1a1a] p-8 rounded-xl shadow-md text-white">
          <h2 className="text-3xl font-bold mb-4">Explore Our Catalog</h2>
          <p className="text-lg">
            From classic tees to exclusive jackets, every piece in Cove’s collection tells a story. Browse by fit, color, or season.
          </p>
        </div>
        <div className="bg-[#1a1a1a] p-8 rounded-xl shadow-md text-white">
          <h2 className="text-3xl font-bold mb-4">Dynamic Filters</h2>
          <p className="text-lg">
            Want it tight, relaxed, or oversized? Our filters help you visualize how each size fits in real time on your avatar.
          </p>
        </div>
      </div>
    </section>
  )
}
