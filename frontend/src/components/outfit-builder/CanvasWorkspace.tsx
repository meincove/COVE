import React from 'react';
import { useOutfitStore, ProductCandidate } from '@/hooks/useOutfitStore';
import { Search, ZoomIn, ZoomOut, RotateCcw, MousePointer2, Move, Sparkles, Trash2, RefreshCw, Loader2, CheckCircle2, Circle } from 'lucide-react';
import AgenticOutfitBuilder from '@/components/cove-ai/AgenticOutfitBuilder';
import VTOModal from '@/components/outfit-builder/VTOModal';

const CanvasWorkspace: React.FC = () => {
    const { categories, processSteps, anchoredItem, setAnchoredItem, deduplicateProcessSteps, reset } = useOutfitStore();
    const [activeVTOItem, setActiveVTOItem] = React.useState<ProductCandidate | null>(null);

    // Deduplicate on mount to fix session storage issues
    React.useEffect(() => {
        deduplicateProcessSteps();
    }, [deduplicateProcessSteps]);

    // Navigation handler
    const handleProductClick = (slug: string) => {
        // Open in new tab or navigate
        if (!slug) return;
        window.open(`/product/${slug}`, '_blank');
    };
    // Pan & Zoom State
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    const canvasRef = React.useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        document.body.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
    };

    // Global listener for mouse up to catch drops outside component
    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging]);

    // Check if thinking
    const isThinking = processSteps.some(step => step.status === 'active');
    const hasItems = Object.keys(categories).length > 0;

    return (
        <div className="flex-1 bg-gray-50/50 relative overflow-hidden h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
        >
            {/* VTO Modal */}
            {activeVTOItem && (
                <VTOModal
                    isOpen={!!activeVTOItem}
                    onClose={() => setActiveVTOItem(null)}
                    productImage={activeVTOItem.imageUrl || ''}
                    productTitle={activeVTOItem.title}
                />
            )}

            {/* Breathing RGB Background Grid */}
            <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isThinking ? 'opacity-10' : 'opacity-[0.03]'}`}
                style={{
                    backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    animation: isThinking ? 'rgb-pulse 4s infinite alternate' : 'none'
                }}
            />
            <style jsx>{`
            @keyframes rgb-pulse {
                0% { filter: hue-rotate(0deg) drop-shadow(0 0 5px rgba(0,0,255,0.1)); transform: scale(1); }
                50% { filter: hue-rotate(180deg) drop-shadow(0 0 15px rgba(255,0,0,0.2)); transform: scale(1.02); }
                100% { filter: hue-rotate(360deg) drop-shadow(0 0 5px rgba(0,255,0,0.1)); transform: scale(1); }
            }
        `}</style>

            {/* Floating Controls (Top Right) */}
            <div className="absolute top-6 right-6 z-50 flex gap-2">
                {hasItems && (
                    <button
                        onClick={() => {
                            if (confirm('Clear all items and start over?')) {
                                reset();
                                setPan({ x: 0, y: 0 }); // Reset view
                            }
                        }}
                        className="p-3 bg-white text-red-500 rounded-full shadow-md hover:bg-red-50 hover:scale-105 transition-all"
                        title="Clear All"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
                <button
                    onClick={() => setPan({ x: 0, y: 0 })}
                    className="p-3 bg-white text-gray-600 rounded-full shadow-md hover:bg-gray-50 hover:scale-105 transition-all"
                    title="Reset View"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Floating Thinking Process Overlay (Fixed UI on top of canvas) */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl pointer-events-none">
                {/* Only children pointer events enabled */}
                <div className="flex gap-4 overflow-x-auto pb-4 mask-fade-right min-h-[60px] justify-center pointer-events-auto">
                    {processSteps.length === 0 && !hasItems && (
                        <div className="text-sm text-gray-400 italic bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                            Start chatting to see agent thinking steps...
                        </div>
                    )}
                    {processSteps.map((step) => (
                        <div key={step.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-full border shadow-sm whitespace-nowrap transition-all ${step.status === 'active' ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse' :
                                step.status === 'completed' ? 'bg-white border-green-100 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'
                                }`}>
                            {step.status === 'active' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {step.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                            {step.status === 'pending' && <Circle className="w-4 h-4" />}
                            <span className="text-sm font-medium">{step.message}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Punnable Canvas Content */}
            <div
                className="w-full h-full p-8 transition-transform duration-75 ease-out origin-center"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px)`
                }}
            >
                <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()} // Prevent pan starting from content click
                >
                    {/* Immersive Dual-Catalog Builder */}
                    <div className="w-full max-w-5xl mx-auto pointer-events-auto min-h-[600px]">
                        <AgenticOutfitBuilder
                            streamEvents={[]}
                            isActive={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CanvasWorkspace;
