// SVG mockup preview for shopping section - shows elegant product grid
export const ShoppingPreview = () => {
    return (
        <svg
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
        >
            {/* Product Grid - 3x2 layout */}
            {[0, 1, 2].map((row) =>
                [0, 1, 2].map((col) => {
                    const x = 30 + col * 125
                    const y = 30 + row * 135

                    return (
                        <g key={`${row}-${col}`}>
                            {/* Product Card */}
                            <rect
                                x={x}
                                y={y}
                                width="110"
                                height="120"
                                rx="8"
                                fill="white"
                                stroke="#f3f4f6"
                                strokeWidth="1.5"
                            />

                            {/* Product Image Area */}
                            <rect
                                x={x + 10}
                                y={y + 10}
                                width="90"
                                height="70"
                                rx="4"
                                fill="#fce7f3"
                            />

                            {/* Fashion Icon */}
                            <circle
                                cx={x + 55}
                                cy={y + 45}
                                r="15"
                                fill="#ec4899"
                                opacity="0.3"
                            />

                            {/* Price */}
                            <rect
                                x={x + 10}
                                y={y + 90}
                                width="40"
                                height="8"
                                rx="4"
                                fill="#ec4899"
                                opacity="0.6"
                            />

                            {/* Add to Cart Button */}
                            <rect
                                x={x + 10}
                                y={y + 102}
                                width="90"
                                height="10"
                                rx="5"
                                fill="#ec4899"
                                opacity="0.2"
                            />
                        </g>
                    )
                })
            )}
        </svg>
    )
}

// SVG mockup preview for platform section - shows dashboard
export const PlatformPreview = () => {
    return (
        <svg
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
        >
            {/* Revenue Metric Card */}
            <rect
                x="30"
                y="30"
                width="340"
                height="60"
                rx="8"
                fill="#1f2937"
                stroke="#374151"
                strokeWidth="1.5"
            />
            <text x="50" y="55" fill="#9ca3af" fontSize="12" fontFamily="sans-serif">
                Revenue
            </text>
            <text x="50" y="75" fill="#10b981" fontSize="20" fontWeight="bold" fontFamily="sans-serif">
                $45.2K
            </text>
            <path
                d="M 320 50 L 330 60 L 340 50"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
            />

            {/* Stat Cards */}
            {[0, 1, 2].map((i) => {
                const x = 30 + i * 120
                return (
                    <g key={i}>
                        <rect
                            x={x}
                            y="110"
                            width="105"
                            height="80"
                            rx="8"
                            fill="#1f2937"
                            stroke="#374151"
                            strokeWidth="1.5"
                        />
                        {/* Icon */}
                        <circle
                            cx={x + 52.5}
                            cy={135}
                            r="12"
                            fill="#10b981"
                            opacity="0.3"
                        />
                        {/* Value */}
                        <rect
                            x={x + 20}
                            y="155"
                            width="65"
                            height="10"
                            rx="5"
                            fill="#10b981"
                            opacity="0.6"
                        />
                        {/* Label */}
                        <rect
                            x={x + 30}
                            y="170"
                            width="45"
                            height="6"
                            rx="3"
                            fill="#6b7280"
                        />
                    </g>
                )
            })}

            {/* Chart Visualization */}
            <g>
                {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                    <rect
                        key={i}
                        x={40 + i * 48}
                        y={280 - height}
                        width="35"
                        height={height}
                        rx="4"
                        fill="#10b981"
                        opacity="0.7"
                    />
                ))}
            </g>
        </svg>
    )
}
