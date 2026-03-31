import React from 'react';
import { useOutfitStore } from '@/hooks/useOutfitStore';
import { Shirt, Ruler, Palette, Info } from 'lucide-react';

const InfoPanel: React.FC = () => {
    const { categories, anchoredItem } = useOutfitStore();

    // Find the anchored item
    const item = anchoredItem
        ? categories[anchoredItem.category]?.candidates.find(c => c.slug === anchoredItem.slug)
        : null;

    if (!item) {
        return (
            <div className="h-full bg-white border-r border-gray-200 p-6 flex flex-col items-center justify-center text-center text-gray-400">
                <Info className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Item Selected</h3>
                <p className="text-sm">Click the anchor icon <span className="inline-block w-4 h-4 border border-gray-400 rounded-full"></span> on any product to view details.</p>
            </div>
        );
    }

    return (
        <div className="h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            {/* Header Image */}
            <div className="relative h-64 bg-gray-100 flex-shrink-0">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Shirt className="w-16 h-16" />
                    </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <span className="text-xs font-bold text-white uppercase tracking-wider bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
                        {anchoredItem?.category}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{item.title}</h2>
                    <p className="text-xl font-medium text-blue-600">${item.price}</p>
                </div>

                {/* Colors (Mock) */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Palette className="w-4 h-4" /> Available Colors
                    </h3>
                    <div className="flex gap-3">
                        {['#000000', '#1a365d', '#555555', '#ffffff'].map((c, i) => (
                            <div
                                key={i}
                                className="w-8 h-8 rounded-full border border-gray-200 shadow-sm cursor-pointer hover:scale-110 transition-transform ring-offset-2 hover:ring-2 ring-blue-500"
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* Size Chart (Mock) */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Ruler className="w-4 h-4" /> Size & Fit
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">True to size. Based on your profile, <strong>Medium</strong> is recommended.</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs text-gray-500">
                        <div className="font-medium p-1 border-b">Size</div>
                        <div className="font-medium p-1 border-b">Chest</div>
                        <div className="font-medium p-1 border-b">Length</div>
                        <div className="font-medium p-1 border-b">Sleeve</div>

                        <div className="p-1">S</div><div className="p-1">36-38"</div><div className="p-1">27"</div><div className="p-1">32"</div>
                        <div className="p-1 font-bold text-black bg-white rounded shadow-sm">M</div><div className="p-1 font-bold text-black bg-white rounded shadow-sm">39-41"</div><div className="p-1 font-bold text-black bg-white rounded shadow-sm">28"</div><div className="p-1 font-bold text-black bg-white rounded shadow-sm">33"</div>
                        <div className="p-1">L</div><div className="p-1">42-44"</div><div className="p-1">29"</div><div className="p-1">34"</div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">About Item</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {item.stylist_note || "A versatile piece perfect for your curated outfit. Crafted with premium materials for comfort and style."}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
                    Add to Cart
                </button>
                <button className="px-4 py-3 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                    Save
                </button>
            </div>
        </div>
    );
};

export default InfoPanel;
