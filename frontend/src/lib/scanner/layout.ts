import type { UiProduct } from "@/src/lib/catalog/shared"

export type ScannerTile = {
    key: string
    x: number
    y: number
    w: number
    h: number
    product: UiProduct
}

type GridConfig = {
    vw: number
    vh: number
    canvasScale: number
    gapFactor: number
    products: UiProduct[]
}

// Pseudo-random generator for deterministic layouts
function random(seed: number) {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
}

export class ScannerGrid {
    private base: number
    private gap: number
    private stepX: number
    private stepY: number
    private products: UiProduct[]

    constructor(config: GridConfig) {
        // "Bigger cards" logic from previous step
        this.base = Math.max(90, Math.min(190, Math.round(Math.min(config.vw, config.vh) * 0.125)))
        // "More gaps" logic
        this.gap = Math.max(75, Math.min(220, Math.round(this.base * config.gapFactor * 1.55)))

        this.stepX = Math.round(this.base + this.gap)
        this.stepY = Math.round(this.base + this.gap)
        this.products = config.products.length ? config.products : []
    }

    // Get tiles visible in the current viewport (defined by camera x,y)
    getVisibleTiles(camX: number, camY: number, viewportW: number, viewportH: number): ScannerTile[] {
        if (!this.products.length) return []

        // Calculate column/row range roughly visible
        // We add a buffer of 1-2 cols/rows to ensure smooth entry
        const buffer = 2

        const startCol = Math.floor(camX / this.stepX) - buffer
        const endCol = Math.ceil((camX + viewportW) / this.stepX) + buffer

        const startRow = Math.floor(camY / this.stepY) - buffer
        const endRow = Math.ceil((camY + viewportH) / this.stepY) + buffer

        const tiles: ScannerTile[] = []

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                tiles.push(this.createTile(c, r))
            }
        }

        return tiles
    }

    private createTile(col: number, row: number): ScannerTile {
        // Deterministic unique ID for this cell
        // We use a pairing function or string key to seed our random
        // Using string key for simplicity in hashing
        const seedKey = `c${col}_r${row}`
        // Simple hash for seed
        let hash = 0
        for (let i = 0; i < seedKey.length; i++) {
            hash = ((hash << 5) - hash) + seedKey.charCodeAt(i)
            hash |= 0
        }
        const seed = Math.abs(hash)

        // 1. Pick Product
        // We want a deterministic but "random-looking" walk through products
        // Simple modulus is fine for now, or we could use the seed
        // Using positive modulus for infinite scrolling
        const pIndex = Math.abs((col * 13 + row * 7)) % this.products.length
        const product = this.products[pIndex]

        // 2. Determine Shape (Portrait, Landscape, Square)
        const rndShape = random(seed)
        let w, h

        if (rndShape < 0.4) {
            // Portrait
            w = this.base
            h = Math.round(this.base * 1.3)
        } else if (rndShape < 0.7) {
            // Landscape
            w = Math.round(this.base * 1.45)
            h = Math.round(this.base * 0.95)
        } else {
            // Square-ish
            w = Math.round(this.base * 1.05)
            h = Math.round(this.base * 1.05)
        }

        // 3. Jitter (Safe)
        const jittermax = this.gap * 0.35
        const rndJitterX = random(seed + 1)
        const rndJitterY = random(seed + 2)

        const jX = (rndJitterX * jittermax * 2) - jittermax
        const jY = (rndJitterY * jittermax * 2) - jittermax

        return {
            key: `${col}.${row}`, // Stable key for React recycling
            x: col * this.stepX + jX,
            y: row * this.stepY + jY,
            w,
            h,
            product
        }
    }
}
