import React from 'react';
import { useOutfitStore } from '@/stores/outfitStore';

const OutfitCanvas: React.FC = () => {
    const { items, selectedItemId, selectItem } = useOutfitStore();

    return (
        <div className="flex-1 bg-gray-100 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            />

            <div className="relative z-10 w-full max-w-4xl h-full flex flex-col">
                <h2 className="text-2xl font-bold text-gray-800 mb-8 self-start">Outfit Canvas</h2>

                {/* Canvas Area */}
                <div className="flex-1 grid grid-cols-2 gap-8 items-center justify-items-center">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => selectItem(item.id)}
                            className={`relative group transition-all duration-300 transform ${selectedItemId === item.id ? 'scale-105 z-20' : 'scale-100 opacity-90 hover:opacity-100'
                                }`}
                        >
                            {/* Selected Indicator */}
                            {selectedItemId === item.id && (
                                <div className="absolute -inset-4 border-2 border-dashed border-blue-400 rounded-xl" />
                            )}

                            <div className="relative shadow-xl rounded-xl overflow-hidden bg-white w-64 h-80">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                    <p className="text-white font-medium">{item.name}</p>
                                    <p className="text-white/80 text-sm">${item.price}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OutfitCanvas;
