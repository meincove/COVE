"use client"
export default function CardDemo() {
    // Left card - ONE centered semicircle cutout at bottom
    const leftPath = `
    M 20 0
    Q 0 0 0 20
    L 0 580
    Q 0 600 20 600
    L 160 600
    Q 180 600 200 620
    Q 220 600 240 600
    L 380 600
    L 400 580
    L 400 20
    Q 400 0 380 0
    Z
  `

    // Right card - mirrored
    const rightPath = `
    M 380 0
    Q 400 0 400 20
    L 400 580
    Q 400 600 380 600
    L 240 600
    Q 220 600 200 620
    Q 180 600 160 600
    L 20 600
    L 0 580
    L 0 20
    Q 0 0 20 0
    Z
  `
    return (
        <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center gap-12">
            {/* Left Card */}
            <svg width="400" height="600" viewBox="0 0 400 600">
                <defs>
                    <linearGradient id="leftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f0d4c8" />
                        <stop offset="100%" stopColor="#d8d4cc" />
                    </linearGradient>
                </defs>
                <path d={leftPath} fill="url(#leftGrad)" stroke="#000" strokeWidth="2" />
            </svg>
            {/* Right Card */}
            <svg width="400" height="600" viewBox="0 0 400 600">
                <defs>
                    <linearGradient id="rightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4a4a4a" />
                        <stop offset="100%" stopColor="#1a1a1a" />
                    </linearGradient>
                </defs>
                <path d={rightPath} fill="url(#rightGrad)" stroke="#fff" strokeWidth="2" />
            </svg>
        </div>
    )
}