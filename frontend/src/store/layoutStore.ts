
import { create } from 'zustand';
import { AgentItem } from '@/types/agent';

interface LayoutState {
    isCanvasOpen: boolean;
    generatedOutfit: AgentItem[] | null;

    openCanvas: () => void;
    closeCanvas: () => void;
    toggleCanvas: () => void;
    setGeneratedOutfit: (items: AgentItem[]) => void;
    reorderOutfit: (items: AgentItem[]) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
    isCanvasOpen: false,
    generatedOutfit: null,

    openCanvas: () => set({ isCanvasOpen: true }),
    closeCanvas: () => set({ isCanvasOpen: false }),
    toggleCanvas: () => set((state) => ({ isCanvasOpen: !state.isCanvasOpen })),

    setGeneratedOutfit: (items) => set({
        generatedOutfit: items,
        isCanvasOpen: true // Auto-open when outfit is set
    }),

    reorderOutfit: (items) => set({ generatedOutfit: items }),
}));
