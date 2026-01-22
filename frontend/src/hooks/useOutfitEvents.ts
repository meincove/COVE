import { useEffect, useRef } from 'react';
import { useOutfitStore, ProductCandidate } from './useOutfitStore';

interface StreamEvent {
    event_type: string;
    category?: string;
    candidates?: ProductCandidate[];
    selected_item?: ProductCandidate;
    total_found?: number;
    status?: string;
    slug?: string;
    message?: string;
    reason?: string;
    budget_max?: number;
}

export function useOutfitEvents(streamEvents: StreamEvent[]) {
    const { setCategoryState, updateCandidate, setBudget, setActiveCategory } = useOutfitStore();
    const processedCountRef = useRef(0);

    useEffect(() => {
        if (!streamEvents.length) return;

        // Process only NEW events
        const newEvents = streamEvents.slice(processedCountRef.current);
        processedCountRef.current = streamEvents.length;

        newEvents.forEach((event) => {
            // Handle budget
            if (event.event_type === "budget_set" && event.budget_max) {
                setBudget(event.budget_max, 0);
                return;
            }

            // Normalize Category: "top" -> "Tops", "bottom" -> "Bottoms"
            let category = event.category;
            if (category) {
                const lower = category.toLowerCase();
                if (lower.includes('top') || lower.includes('shirt') || lower.includes('sweater')) category = 'Tops';
                else if (lower.includes('bottom') || lower.includes('pant') || lower.includes('jean') || lower.includes('short')) category = 'Bottoms';
                else if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('boot')) category = 'Shoes';
                else category = category.charAt(0).toUpperCase() + category.slice(1); // Fallback
            }

            if (!category) return;

            switch (event.event_type) {
                case "category_start":
                    setCategoryState(category, {
                        status: "searching",
                        candidates: [],
                    });
                    setActiveCategory(category);
                    break;

                case "category_candidates":
                    console.log('📦 [useOutfitEvents] Storing candidates for', category, ':', event.candidates?.length || 0, 'items');
                    setCategoryState(category, {
                        status: "found",
                        candidates: event.candidates || [],
                        totalFound: event.total_found,
                    });
                    break;

                case "item_selected":
                    setCategoryState(category, {
                        status: "selected",
                        selectedItem: event.selected_item,
                    });
                    break;

                case "category_vetting":
                    if (event.slug) {
                        updateCandidate(category, event.slug, {
                            vettingStatus: event.status as any,
                            rejectionReason: event.reason
                        });
                    }
                    break;

                case "category_error":
                case "error":
                    if (event.slug) {
                        updateCandidate(category, event.slug, {
                            vettingStatus: "rejected",
                            rejectionReason: event.message || "Analysis failed"
                        });
                    } else {
                        setCategoryState(category, {
                            status: "found",
                            candidates: [],
                            totalFound: 0
                        });
                    }
                    break;
            }
        });
    }, [streamEvents, setCategoryState, updateCandidate, setActiveCategory, setBudget]);
}
