
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
    <div
      className="space-y-2 p-4 rounded-lg overflow-y-auto bg-transparent "
      style={{ height: '60vh' }}
    >
      {/* Breadcrumb Routing Info */}
      <p className="text-xs text-gray-400 uppercase tracking-wide mt-20">
        Home / {tier} / {type}
      </p>

      {/* COVE Tier Label */}
      <p className="text-xs text-red-600 uppercase font-semibold tracking-widest mt-20 ml-2">
        COVE {tier}
      </p>

      {/* Product Name */}
      <h1 className="text-3xl md:text-3xl font-semibold text-black ml-2">
        {name}
      </h1>

      {/* Fit line */}
      {fit && (
        <p className="text-4xl text-black italic ml-13 mt-3 mb-2 font-semibold">
          X {fit}
        </p>
      )}

      {/* Material */}
      <p className="text-3xl text-black font-semibold ml-2">{material}</p>

      {/* Price */}
      <p className="text-2xl font-xs text-black pt-2 mt-10 ml-2">
        €{price.toFixed(2)}
      </p>
    </div>
  )
}


