// src/components/cove-ai/FloatingChatbot.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, ShoppingBag, Package, HelpCircle, Shirt, TrendingUp, Heart, ShoppingCart } from "lucide-react";
import CoveChatWidget from "@/src/components/cove-ai/CoveChatWidget";
import ProactiveBubble from "@/src/components/cove-ai/ProactiveBubble";
import { useProactiveSignals, ProactiveResponse } from "@/src/hooks/useProactiveSignals";

import { useLayoutStore } from "@/src/store/layoutStore";
import OutfitCanvas from "@/src/components/cove-ai/OutfitCanvas";

export default function FloatingChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [activeView, setActiveView] = useState<'chat' | 'outfit_builder' | 'cart'>('chat');

    // Layout Store
    const { isCanvasOpen, closeCanvas } = useLayoutStore();

    // Proactive Offer State
    const [activeOffer, setActiveOffer] = useState<ProactiveResponse | null>(null);

    // Listen for proactive signals
    useProactiveSignals((offer) => {
        if (!isOpen) {
            setActiveOffer(offer);
            setTimeout(() => setActiveOffer(null), 15000);
        }
    });

    // Ref to chat widget for triggering messages
    const chatWidgetRef = useRef<{ sendQuickMessage: (msg: string) => void }>(null);

    // Bounce animation on mount
    useEffect(() => {
        const timer = setTimeout(() => setIsAnimating(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const toggleChat = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (newState) {
            setHasUnread(false);
            setActiveOffer(null);
        }
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('cove_chat_open', String(newState));
        }
    };

    // Handle quick action clicks
    const handleQuickAction = (action: string) => {
        // Ensure chat view is active
        setActiveView('chat');

        // Send message via chat widget
        if (chatWidgetRef.current) {
            chatWidgetRef.current.sendQuickMessage(action);
        }
    };

    // Load persisted state on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const persistedState = sessionStorage.getItem('cove_chat_open');
            if (persistedState === 'true') {
                setIsOpen(true);
            }
        }
    }, []);

    return (
        <>
            <ProactiveBubble
                message={activeOffer?.message || ""}
                isVisible={!!activeOffer && !isOpen}
                onOpen={() => {
                    setIsOpen(true);
                    setActiveOffer(null);
                }}
                onDismiss={() => setActiveOffer(null)}
            />
            {/* Floating Chat Button - Enhanced */}
            <button
                onClick={toggleChat}
                className={`
          fixed bottom-6 right-6 z-[999]
          group
          ${isAnimating && !isOpen ? 'animate-bounce-slow' : ''}
        `}
                aria-label={isOpen ? "Close your personal stylist" : "Chat with your personal stylist"}
            >
                {/* Enhanced Glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-75 blur-2xl group-hover:opacity-100 transition-opacity duration-300 animate-pulse-slow" />

                {/* Main button - Larger & More Premium */}
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 shadow-2xl shadow-purple-500/50 flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 ring-4 ring-purple-500/20">
                    {isOpen ? (
                        <X className="h-8 w-8 text-white transition-transform duration-300" />
                    ) : (
                        <>
                            <Sparkles className="h-8 w-8 text-white transition-transform duration-300 group-hover:rotate-12" />
                            {hasUnread && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white animate-ping" />
                            )}
                        </>
                    )}
                </div>

                {/* More Sparkle effects */}
                {!isOpen && (
                    <>
                        <Sparkles className="absolute -top-3 -left-3 h-6 w-6 text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                        <Sparkles className="absolute -bottom-2 -right-2 h-5 w-5 text-pink-300 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse delay-150" />
                        <Heart className="absolute top-0 right-0 h-4 w-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse delay-300" />
                    </>
                )}
            </button>

            {/* Enhanced Shopping Assistant Window */}
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[998] md:hidden"
                        onClick={toggleChat}
                    />

                    {/* Main Assistant Container - WIDER & More Features */}
                    <div className={`
            fixed z-[999]
            bottom-6 right-6
            ${isCanvasOpen ? 'w-[95vw] h-[90vh] max-w-[1600px]' : 'w-[calc(100vw-3rem)] md:w-[600px] lg:w-[680px] h-[calc(100vh-8rem)] md:h-[720px]'}
            rounded-3xl
            bg-gradient-to-br from-neutral-900/98 via-neutral-950/98 to-black/98
            backdrop-blur-2xl
            border border-white/10
            shadow-2xl shadow-purple-500/30
            overflow-hidden
            transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
            ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
          `}>
                        {/* Wrapper for flex layout */}
                        <div className="relative flex flex-col h-full">
                            {/* Animated gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 pointer-events-none animate-gradient" />

                            {/* Premium Header */}
                            <div className="relative bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-purple-600/30 backdrop-blur-md border-b border-white/10 px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ring-2 ring-purple-400/50">
                                                <Sparkles className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-neutral-900 animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                                Your Personal Stylist
                                                <TrendingUp className="h-4 w-4 text-pink-400" />
                                            </h3>
                                            <p className="text-xs text-neutral-400">Powered by AI • Always learning your style</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleChat}
                                        className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group"
                                        aria-label="Close assistant"
                                    >
                                        <X className="h-5 w-5 text-neutral-400 group-hover:text-white transition-colors" />
                                    </button>
                                </div>

                                {/* Enhanced Quick Actions - More Shopping Focused */}
                                <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
                                    {[
                                        { icon: ShoppingBag, label: "Discover Styles", action: "Show me trending styles", gradient: "from-purple-500 to-pink-500" },
                                        { icon: Shirt, label: "Build Outfit", action: "I want to build an outfit", gradient: "from-blue-500 to-cyan-500" },
                                        { icon: Package, label: "My Orders", action: "Show my orders", gradient: "from-green-500 to-emerald-500" },
                                        { icon: Heart, label: "Get Inspired", action: "Inspire me", gradient: "from-red-500 to-pink-500" }
                                    ].map((chip, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleQuickAction(chip.action)}
                                            className={`
                      flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full
                      bg-gradient-to-r ${chip.gradient} bg-opacity-10
                      hover:bg-opacity-20
                      border border-white/20 hover:border-white/30
                      text-xs font-medium text-white
                      transition-all duration-200
                      hover:scale-105 hover:shadow-lg
                    `}
                                        >
                                            <chip.icon className="h-4 w-4" />
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>

                                {/* View Tabs - Shopping Assistant Views */}
                                <div className="mt-3 flex gap-1 bg-black/20 rounded-lg p-1">
                                    {[
                                        { id: 'chat', label: 'Chat', icon: MessageCircle },
                                        { id: 'outfit_builder', label: 'Outfit Builder', icon: Shirt },
                                        { id: 'cart', label: 'Cart', icon: ShoppingCart }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveView(tab.id as any)}
                                            className={`
                      flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                      ${activeView === tab.id
                                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                                }
                    `}
                                        >
                                            <tab.icon className="h-3.5 w-3.5" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content Area - Split View */}
                            {/* Fixed height calc - header is ~200px (py-5 + quick actions + tabs + spacing) */}
                            <div className="flex flex-1 min-h-0">
                                {/* Left Panel: Chat (Always visible, shrinks when canvas open) */}
                                <div className={`
                                relative h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                                ${isCanvasOpen ? 'w-1/3 border-r border-white/10' : 'w-full'}
                            `}>
                                    {/* Header (Moved inside left panel) */}
                                    {activeView === 'chat' && (
                                        <CoveChatWidget ref={chatWidgetRef} mode="chat" />
                                    )}
                                    {activeView === 'outfit_builder' && (
                                        <CoveChatWidget ref={chatWidgetRef} mode="outfit_builder" />
                                    )}
                                    {activeView === 'cart' && (
                                        <div className="h-full flex items-center justify-center text-neutral-500">
                                            <div className="text-center">
                                                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-pink-500" />
                                                <p className="font-medium">Your Cart</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Panel: Outfit Canvas (Slides in) */}
                                <div className={`
                                h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden
                                ${isCanvasOpen ? 'w-2/3 opacity-100' : 'w-0 opacity-0'}
                            `}>
                                    {isCanvasOpen && <OutfitCanvas />}
                                </div>
                            </div>
                        </div>
                        {/* Close flex wrapper */}
                    </div>
                </>
            )}

            <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }

        @keyframes gradient {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.15; }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }

        .animate-gradient {
          animation: gradient 8s ease-in-out infinite;
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </>
    );
}
