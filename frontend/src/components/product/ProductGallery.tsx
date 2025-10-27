'use client'

interface ProductGalleryProps {
  images: string[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export default function ProductGallery({
  images,
  selectedIndex,
  onSelect,
}: ProductGalleryProps) {
  return (
    <div className="flex justify-evenly items-center w-full py-4 px-2 rounded-b-xl mt-35 bg-transparent">
      {images.map((img, i) => {
        const isSelected = i === selectedIndex

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`
              relative rounded-full overflow-hidden transition-all duration-300 ease-out
              opacity-${isSelected ? '100' : '80'}
              ${isSelected ? '-translate-y-[2px]' : ''}
            `}
            style={{
              width: 64,
              height: 80,
              backgroundColor: 'transparent',
              outlineStyle: 'solid',
              outlineColor: isSelected ? 'black' : 'rgb(156,163,175)', // Tailwind gray-400
              outlineWidth: isSelected ? '2px' : '1px',
              transition: 'outline-width 300ms ease, outline-color 300ms ease, transform 300ms ease',
            }}
          >
            {/* Hover Effect: animated outline only if not selected */}
            {!isSelected && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none hover:opacity-30 hover:bg-gradient-to-b from-gray-400 to-black z-0"
              />
            )}

            <img
              src={`/clothing-images/${img}`}
              alt={`Thumbnail ${i + 1}`}
              className="object-contain w-full h-full relative z-10"
            />
          </button>
        )
      })}
    </div>
  )
}
