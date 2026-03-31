import React from 'react';
import { useOutfitStore } from '@/stores/outfitStore';

const DataPanel: React.FC = () => {
    const { items, selectedItemId, budget } = useOutfitStore();

    const selectedItem = items.find(i => i.id === selectedItemId);
    const totalCost = items.reduce((sum, item) => sum + item.price, 0);
    const remainingBudget = budget - totalCost;

    return (
        <div className="w-1/4 bg-white border-l border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold">Details & Analytics</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Budget Section */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Budget Analysis</h3>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</span>
                        <span className="text-sm text-gray-500 mb-1">Total Cost</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div
                            className={`h-2.5 rounded-full ${remainingBudget >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min((totalCost / budget) * 100, 100)}%` }}
                        />
                    </div>
                    <p className={`text-sm ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {remainingBudget >= 0 ? `$${remainingBudget.toFixed(2)} remaining` : `$${Math.abs(remainingBudget).toFixed(2)} over budget`}
                    </p>
                </div>

                {/* Selected Item Details */}
                {selectedItem ? (
                    <div className="space-y-4">
                        <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-100">
                            <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{selectedItem.name}</h3>
                            <p className="text-gray-500">{selectedItem.category}</p>
                        </div>

                        {/* Mock Size Chart Interaction */}
                        <div className="border-t border-gray-100 pt-4">
                            <h4 className="font-medium mb-3">Size & Fit</h4>
                            <div className="flex gap-2 mb-3">
                                {['S', 'M', 'L', 'XL'].map(size => (
                                    <button
                                        key={size}
                                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-black hover:bg-gray-50 focus:bg-black focus:text-white transition-colors"
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500">
                                Based on customers like you, <strong>Medium</strong> is recommended.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-10">
                        Select an item to view details
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataPanel;
