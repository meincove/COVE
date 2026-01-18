"use client";

import React from "react";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle, Clock, ChevronRight, ExternalLink } from "lucide-react";

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

interface Order {
    id: string;
    orderNumber: string;
    date: string;
    status: "processing" | "shipped" | "delivered" | "cancelled";
    total: number;
    items: OrderItem[];
    trackingUrl?: string;
}

interface OrderHistoryProps {
    orders?: Order[];
}

// Mock data
const mockOrders: Order[] = [
    {
        id: "1",
        orderNumber: "COV-2024-001",
        date: "Jan 15, 2024",
        status: "delivered",
        total: 189.99,
        items: [
            { id: "a", name: "Classic White Tee", price: 49.99, quantity: 2 },
            { id: "b", name: "Slim Fit Jeans", price: 89.99, quantity: 1 },
        ]
    },
    {
        id: "2",
        orderNumber: "COV-2024-002",
        date: "Jan 10, 2024",
        status: "shipped",
        total: 245.00,
        trackingUrl: "#",
        items: [
            { id: "a", name: "Leather Jacket", price: 245.00, quantity: 1 },
        ]
    },
    {
        id: "3",
        orderNumber: "COV-2024-003",
        date: "Dec 28, 2023",
        status: "processing",
        total: 79.99,
        items: [
            { id: "a", name: "Canvas Sneakers", price: 79.99, quantity: 1 },
        ]
    },
];

const statusConfig = {
    processing: { label: "Processing", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
    shipped: { label: "Shipped", icon: Truck, color: "text-blue-600 bg-blue-50" },
    delivered: { label: "Delivered", icon: CheckCircle, color: "text-green-600 bg-green-50" },
    cancelled: { label: "Cancelled", icon: Package, color: "text-red-600 bg-red-50" },
};

export default function OrderHistory({ orders = mockOrders }: OrderHistoryProps) {
    return (
        <div className="space-y-4">
            {orders.map((order, idx) => {
                const status = statusConfig[order.status];
                const StatusIcon = status.icon;

                return (
                    <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                        <StatusIcon className="h-3.5 w-3.5" />
                                        {status.label}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">Ordered on {order.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">${order.total.toFixed(2)}</p>
                                <p className="text-sm text-gray-500">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                                        <Package className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="font-medium text-gray-900">${item.price.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {order.trackingUrl && (
                                    <a
                                        href={order.trackingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        <Truck className="h-4 w-4" />
                                        Track Order
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                            <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                                View Details
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                );
            })}

            {/* Empty State */}
            {orders.length === 0 && (
                <div className="text-center py-16">
                    <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
                    <p className="text-gray-500 mt-1">When you make a purchase, it will appear here.</p>
                </div>
            )}
        </div>
    );
}
