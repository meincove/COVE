// src/components/cove-ai/FloatingChatbot.tsx
"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { MessageCircle, X, Shirt, ShoppingCart, Plus, Smile, ArrowUp, Image as ImageIcon, ArrowLeft, Minus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CoveChatWidget from "@/src/components/cove-ai/CoveChatWidget";
import ProactiveBubble from "@/src/components/cove-ai/ProactiveBubble";
import BubblesStatusPill from "@/src/components/cove-ai/BubblesStatusPill";
import { useProactiveSignals, ProactiveResponse } from "@/src/hooks/useProactiveSignals";
import { useLayoutStore } from "@/src/store/layoutStore";
import OutfitModal from "@/src/components/cove-ai/OutfitModal";

export default function FloatingChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveView] = useState<'chat' | 'outfit_builder' | 'cart'>('chat');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState<Array<{ icon: string; status: string; done?: boolean }>>([]);

    // Round 4: Window State
    const [isMinimized, setIsMinimized] = useState(false);
    const [hasOutfitReady, setHasOutfitReady] = useState(false);

    // Track if user has interacted to keep pill visible for feedback
    const [hasInteracted, setHasInteracted] = useState(false);

    // Input state - managed here and passed to CoveChatWidget
    const [inputValue, setInputValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Layout Store
    const { isCanvasOpen, closeCanvas, generatedOutfit } = useLayoutStore();

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
    // Ref to chat widget for triggering messages
    const chatWidgetRef = useRef<{ sendQuickMessage: (msg: string, image?: File) => void; clearChat: () => void }>(null);

    const toggleChat = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (newState) {
            setActiveOffer(null);
            // Focus input when opening
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('cove_chat_open', String(newState));
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

    // Monitor thinking state to enable pill persistence
    useEffect(() => {
        if (isThinking) {
            setHasInteracted(true);
        }
    }, [isThinking]);

    // Handle form submission
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() && !uploadedImage) return;

        if (chatWidgetRef.current) {
            chatWidgetRef.current.sendQuickMessage(inputValue.trim(), uploadedImage?.file);
        }
        setInputValue("");
        setUploadedImage(null);
    };

    // Handle quick action/prompt clicks
    const handleQuickAction = (text: string) => {
        if (chatWidgetRef.current) {
            chatWidgetRef.current.sendQuickMessage(text);
        }
    };

    // Handle image upload
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be less than 5MB");
            return;
        }

        // Check file type
        if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
            alert("Only JPEG, PNG, and SVG images are allowed");
            return;
        }

        const preview = URL.createObjectURL(file);
        setUploadedImage({ file, preview });
    };

    const removeUploadedImage = () => {
        if (uploadedImage) {
            URL.revokeObjectURL(uploadedImage.preview);
            setUploadedImage(null);
        }
    };

    // Determine if send button should be active
    const canSend = inputValue.trim().length > 0 || uploadedImage !== null;

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

            {/* Outfit Modal */}
            <OutfitModal
                isOpen={isCanvasOpen && !!generatedOutfit && generatedOutfit.length > 0}
                onClose={closeCanvas}
                items={(generatedOutfit || []).map(item => ({
                    slug: item.slug,
                    title: item.title,
                    price: item.price || 0,
                    imageUrl: item.imageUrl,
                    type: item.type,
                    outfit_id: item.outfit_id,
                }))}
                budgetMax={500}
            />

            {/* Floating Chat Button - Clean Minimal Design */}
            {/* Round 4: Hide Launcher when Open (unless Minimized, but Minimized shows Pill, so Launcher usually hidden if interaction active) */}
            {/* User said: "minimize... gone but Floating pill will become placeholder... Close icon should close... reappear" */}
            {(!isOpen) && (
                <button
                    onClick={toggleChat}
                    className="fixed bottom-6 right-6 z-[999] group"
                    aria-label="Open Bubbles"
                >
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-14 w-14 rounded-full bg-black shadow-lg flex items-center justify-center"
                    >
                        {isOpen ? (
                            <X className="h-6 w-6 text-white" />
                        ) : (
                            <MessageCircle className="h-6 w-6 text-white" />
                        )}
                    </motion.div>
                </button>
            )}

            {/* Chat Window - Clean White Design */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for mobile */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[998] md:hidden"
                            onClick={toggleChat}
                        />

                        {/* Main Chat Container */}
                        {/* Main Chat Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                height: isMinimized ? 'auto' : undefined,
                                width: isMinimized ? 'auto' : undefined
                            }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className={`fixed z-[999] bottom-6 right-6 ${isMinimized ? 'bg-transparent shadow-none' : 'w-[90vw] md:w-[380px] h-[60vh] md:h-[600px] max-h-[850px] max-w-[380px] rounded-2xl bg-white shadow-2xl border border-gray-200'} overflow-hidden flex flex-col`}
                        >
                            {/* Round 4: Minimized View (Click to Restore) */}
                            {isMinimized ? (
                                <div onClickCapture={() => setIsMinimized(false)} className="cursor-pointer">
                                    <BubblesStatusPill isThinking={isThinking} thinkingSteps={thinkingSteps} />
                                </div>
                            ) : (
                                <>
                                    {/* Header - Custom Top Bar with blur */}
                                    <div className="bg-gray-50/80 backdrop-blur-sm h-10 border-b border-gray-100/50 flex items-center justify-between px-3 relative z-10 shrink-0">
                                        <div className="flex items-center gap-2">
                                            {/* Back Arrow (Visual only or maybe back to home?) */}
                                            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                                                <ArrowLeft className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => chatWidgetRef.current?.clearChat()}
                                                className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-gray-400"
                                                title="Clear Chat"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setIsMinimized(true)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                                title="Minimize"
                                            >
                                                <Minus className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={toggleChat}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                                title="Close"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bubbles Status Pill - Floating below header */}
                                    <div className="absolute top-12 left-0 right-0 z-50 flex justify-center pointer-events-none">
                                        <div className="pointer-events-auto">
                                            <BubblesStatusPill
                                                isThinking={isThinking}
                                                thinkingSteps={thinkingSteps}
                                            />
                                        </div>
                                    </div>

                                    {/* Chat Content */}
                                    <div className="flex-1 min-h-0 overflow-hidden pt-2">
                                        <div className={activeView === 'cart' ? 'hidden' : 'h-full'}>
                                            <CoveChatWidget
                                                ref={chatWidgetRef}
                                                mode={activeView === 'outfit_builder' ? 'outfit_builder' : 'chat'}
                                                onThinkingChange={(thinking, steps) => {
                                                    setIsThinking(thinking);
                                                    setThinkingSteps(steps || []);
                                                }}
                                                onQuickAction={handleQuickAction}
                                                onTabChange={(tab) => {
                                                    setActiveView(tab);
                                                    // Note: You can clear Green Dot here if desired
                                                    if (tab === 'outfit_builder') setHasOutfitReady(false);
                                                }}
                                                onOutfitReady={() => setHasOutfitReady(true)}
                                            />
                                        </div>
                                        {activeView === 'cart' && (
                                            <div className="h-full flex items-center justify-center text-gray-400">
                                                <div className="text-center">
                                                    <ShoppingCart className="h-12 w-12 mx-auto mb-3" />
                                                    <p className="font-medium">Your Cart</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Uploaded Image Preview */}
                                    <AnimatePresence>
                                        {uploadedImage && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="px-4 py-2 border-t border-gray-100"
                                            >
                                                <div className="relative inline-block">
                                                    <img
                                                        src={uploadedImage.preview}
                                                        alt="Upload preview"
                                                        className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                                                    />
                                                    <button
                                                        onClick={removeUploadedImage}
                                                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Input Area */}
                                    <form onSubmit={handleSubmit} className="border-t border-gray-100 px-4 py-3">
                                        <motion.div
                                            className={`flex items-center gap-2 rounded-full px-4 py-2 border-2 transition-colors ${isFocused
                                                ? 'bg-white border-green-400 shadow-sm'
                                                : 'bg-gray-50 border-gray-200'
                                                }`}
                                            animate={{
                                                borderColor: isFocused ? '#4ade80' : '#e5e7eb',
                                            }}
                                        >
                                            {/* Image Upload Button */}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                            >
                                                <Plus className="h-5 w-5 text-gray-400" />
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/svg+xml"
                                                onChange={handleImageSelect}
                                                className="hidden"
                                            />

                                            <input
                                                ref={inputRef}
                                                type="text"
                                                placeholder="Write a message..."
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
                                            />

                                            <button
                                                type="button"
                                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                            >
                                                <Smile className="h-5 w-5 text-gray-400" />
                                            </button>

                                            {/* Send Button - Animates based on canSend */}
                                            <motion.button
                                                type="submit"
                                                disabled={!canSend}
                                                className="flex items-center justify-center rounded-full transition-all"
                                                animate={{
                                                    backgroundColor: canSend ? '#22c55e' : 'transparent',
                                                    width: canSend ? 36 : 32,
                                                    height: canSend ? 36 : 32,
                                                    borderWidth: canSend ? 0 : 2,
                                                }}
                                                style={{
                                                    borderColor: '#22c55e',
                                                }}
                                                whileHover={canSend ? { scale: 1.05 } : {}}
                                                whileTap={canSend ? { scale: 0.95 } : {}}
                                            >
                                                <motion.div
                                                    animate={{
                                                        scale: canSend ? 1.1 : 1,
                                                    }}
                                                >
                                                    <ArrowUp
                                                        className={`transition-colors ${canSend ? 'text-white h-5 w-5' : 'text-green-500 h-4 w-4'
                                                            }`}
                                                    />
                                                </motion.div>
                                            </motion.button>
                                        </motion.div>
                                    </form>

                                    {/* View Mode Tabs - Bottom Pills */}
                                    <div className="border-t border-gray-100 px-4 py-2">
                                        <div className="flex justify-center gap-2">
                                            {[
                                                { id: 'chat', label: 'Chat', icon: MessageCircle },
                                                { id: 'outfit_builder', label: 'Outfit Builder', icon: Shirt },
                                                { id: 'cart', label: 'Cart', icon: ShoppingCart }
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => {
                                                        setActiveView(tab.id as any);
                                                        if (tab.id === 'outfit_builder') setHasOutfitReady(false);
                                                    }}
                                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeView === tab.id
                                                        ? 'bg-black text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {/* Green Dot Notification */}
                                                    {tab.id === 'outfit_builder' && hasOutfitReady && activeView !== 'outfit_builder' && (
                                                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                                                    )}
                                                    <tab.icon className="h-3.5 w-3.5" />
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer Branding */}
                                    <div className="border-t border-gray-100 py-2 px-4 text-center">
                                        <span className="text-xs text-gray-400">
                                            Powered by <span className="text-gray-600 font-medium">🫧 CoveAI</span>
                                        </span>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
