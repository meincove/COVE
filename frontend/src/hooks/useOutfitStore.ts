import { create } from 'zustand';

export interface ProductCandidate {
    title: string;
    price: number;
    imageUrl?: string;
    slug: string;
    type?: string;
    gender?: string;
    vettingStatus?: "analyzing" | "rejected" | "accepted";
    rejectionReason?: string;
    outfit_id?: string;
    stylist_note?: string;
    currency?: string;
    category?: string;
}

export interface CategoryState {
    status: "waiting" | "searching" | "found" | "selected";
    candidates: ProductCandidate[];
    selectedItem?: ProductCandidate;
    totalFound?: number;
}

interface OutfitStore {
    categories: Record<string, CategoryState>;
    activeCategory: string | null;
    // Budget tracking
    budgetMax: number;
    budgetUsed: number;

    // Anchor & Visualization
    anchoredItem: { category: string; slug: string } | null;
    processSteps: Array<{ id: string; message: string; status: 'pending' | 'active' | 'completed' | 'error' }>;

    // Actions
    setCategoryState: (category: string, state: Partial<CategoryState>) => void;
    setActiveCategory: (category: string) => void;
    setAnchoredItem: (item: { category: string; slug: string } | null) => void;
    addProcessStep: (step: { id: string; message: string; status: 'pending' | 'active' | 'completed' | 'error' }) => void;
    deduplicateProcessSteps: () => void;
    updateProcessStep: (id: string, status: 'pending' | 'active' | 'completed' | 'error') => void;
    updateCandidate: (category: string, slug: string, updates: Partial<ProductCandidate>) => void;
    setBudget: (max: number, used: number) => void;
    reset: () => void;
}

import { persist, createJSONStorage } from 'zustand/middleware';

export const useOutfitStore = create<OutfitStore>()(
    persist(
        (set) => ({
            categories: {},
            activeCategory: null,
            budgetMax: 500,
            budgetUsed: 0,
            anchoredItem: null,
            processSteps: [],

            setCategoryState: (category, newState) => set((state) => ({
                categories: {
                    ...state.categories,
                    [category]: {
                        ...(state.categories[category] || { status: "waiting", candidates: [] }),
                        ...newState
                    }
                }
            })),

            setActiveCategory: (category) => set({ activeCategory: category }),

            setAnchoredItem: (item) => set({ anchoredItem: item }),

            addProcessStep: (step) => set((state) => {
                if (state.processSteps.some(s => s.id === step.id)) return state;
                return { processSteps: [...state.processSteps, step] };
            }),

            deduplicateProcessSteps: () => set((state) => {
                const seen = new Set();
                const uniqueSteps = state.processSteps.filter(step => {
                    const duplicate = seen.has(step.id);
                    seen.add(step.id);
                    return !duplicate;
                });
                return { processSteps: uniqueSteps };
            }),

            updateProcessStep: (id, status) => set((state) => ({
                processSteps: state.processSteps.map(s => s.id === id ? { ...s, status } : s)
            })),

            updateCandidate: (category, slug, updates) => set((state) => {
                const catState = state.categories[category];
                if (!catState) return state;

                const updatedCandidates = catState.candidates.map(c =>
                    c.slug === slug ? { ...c, ...updates } : c
                );

                return {
                    categories: {
                        ...state.categories,
                        [category]: {
                            ...catState,
                            candidates: updatedCandidates
                        }
                    }
                };
            }),

            setBudget: (max, used) => set({ budgetMax: max, budgetUsed: used }),

            reset: () => set({
                categories: {},
                activeCategory: null,
                budgetMax: 500,
                budgetUsed: 0,
                anchoredItem: null,
                processSteps: []
            })
        }),
        {
            name: 'cove-outfit-store', // key in storage
            storage: createJSONStorage(() => sessionStorage), // session persistence
        }
    )
);
