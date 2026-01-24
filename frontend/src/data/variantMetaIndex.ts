
// Metadata for specific variants (e.g. fabric weight, specialized details)
// This is a placeholder implementation that can be expanded with real data

interface VariantMeta {
    gsm?: number;
    weight_label?: string;
    season?: string;
}

const variantData: Record<string, VariantMeta> = {
    // Example entries
    'VAR-HEAVY-001': { gsm: 400, weight_label: 'Heavyweight', season: 'Winter' },
    'VAR-LIGHT-002': { gsm: 180, weight_label: 'Lightweight', season: 'Summer' },
};

export const getVariantMeta = (variantId?: string): VariantMeta | null => {
    if (!variantId) return null;
    return variantData[variantId] || null;
};
