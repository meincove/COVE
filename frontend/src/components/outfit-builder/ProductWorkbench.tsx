import React from 'react';
import { useOutfitStore } from '@/stores/outfitStore';

const ProductWorkbench: React.FC = () => {
    const { items, selectedItemId, selectItem } = useOutfitStore();

    return (
        <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Your Wardrobe</h2>
                <p className="text-sm text-gray-500">Select items to visualize</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => selectItem(item.id)}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedItemId === item.id
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                    >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Info */}
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                            <p className="text-xs text-gray-500">{item.category}</p>
                        </div>

                        {/* Price */}
                        <div className="text-sm font-semibold text-gray-900">
                            ${item.price.toFixed(0)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductWorkbench;
