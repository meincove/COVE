type ProductInfoProps = {
  name: string
  price: number
  material: string
  description: string
  tier: string
  type: string
  fit: string
}

export default function ProductInfo({
  name,
  price,
  material,
  description,
  tier,
  type,
  fit,
}: ProductInfoProps) {
  return (
    <div className="flex flex-col gap-6 text-black">
      {/* Header Group */}
      <div>
        <div className="flex items-center gap-1 text-yellow-500 mb-4">
          {[1, 2, 3, 4, 5].map(i => (
            <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-4 h-4">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          ))}
          <span className="text-xs font-bold text-black/40 ml-2 tracking-widest uppercase">(128 Reviews)</span>
        </div>

        <div className="text-xs font-bold tracking-widest text-red-600 mb-2 uppercase">
          {tier} Collection
        </div>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9]">
          {name}
        </h1>
        <p className="text-xl font-medium mt-2 text-black/70">
          €{price.toFixed(2)}
        </p>
      </div>

      {/* Description Block */}
      <div className="prose prose-sm text-black/80 leading-relaxed">
        <p>{description}</p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-y-4 gap-x-2 pt-4 border-t border-black/10">
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-black/40 mb-1">Material</span>
          <span className="text-sm font-semibold">{material}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-black/40 mb-1">Fit</span>
          <span className="text-sm font-semibold">{fit || 'Regular'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-black/40 mb-1">Type</span>
          <span className="text-sm font-semibold">{type}</span>
        </div>
      </div>

      {/* Editorial Blurb (Placeholder) */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-black/5">
        <p className="text-xs italic text-black/50">
          "Designed for the modern era, the {name} combines {material.toLowerCase()} textures with our signature {fit?.toLowerCase() || 'relaxed'} silhouette."
        </p>
      </div>
    </div>
  )
}


