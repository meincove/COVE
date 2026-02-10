// src/components/cove-ai/FloatingChatbot.tsx
"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { MessageCircle, X, Shirt, ShoppingCart, Plus, Smile, ArrowUp, Image as ImageIcon, ArrowLeft, Minus, Trash2, LogIn, UserPlus, MoreHorizontal, RefreshCw, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CoveChatWidget from "@/components/cove-ai/CoveChatWidget";
import ProactiveBubble from "@/components/cove-ai/ProactiveBubble";
import BubblesStatusPill from "@/components/cove-ai/BubblesStatusPill";
import { useProactiveSignals, ProactiveResponse } from "@/hooks/useProactiveSignals";
import { useLayoutStore } from "@/store/layoutStore";
// OutfitModal removed - outfits now shown only in Outfit Builder tab
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useAuthModal } from "@/context/AuthModalContext";

export default function FloatingChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    // "started" means the user clicked "Start Chatting" or has historically chatted
    const [hasStarted, setHasStarted] = useState(false);
    const [activeView, setActiveView] = useState<'chat' | 'outfit_builder' | 'cart'>('chat');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState<Array<{ icon: string; status: string; done?: boolean }>>([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const [hasOutfitReady, setHasOutfitReady] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Input state
    const [inputValue, setInputValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auth & Routing
    const { isSignedIn, user } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();
    const pathname = usePathname();

    // Layout Store
    const { isCanvasOpen, closeCanvas, generatedOutfit } = useLayoutStore();

    // Auth Modal
    const { openAuthModal } = useAuthModal();

    // Proactive Offer - MUST be before any conditional returns (Rules of Hooks)
    const [activeOffer, setActiveOffer] = useState<ProactiveResponse | null>(null);

    useProactiveSignals((offer) => {
        if (!isOpen) {
            setActiveOffer(offer);
            setTimeout(() => setActiveOffer(null), 15000);
        }
    });

    // Widget Ref - MUST be before any conditional returns (Rules of Hooks)
    const chatWidgetRef = useRef<{ sendQuickMessage: (msg: string, image?: File) => void; clearChat: () => void }>(null);

    // Don't render on auth pages - keeps UI clean
    // State is preserved via localStorage ('cove_chat_should_restore') for return
    if (pathname?.includes('/sign-in') || pathname?.includes('/sign-up')) {
        return null;
    }

    // Toggle Open/Close
    const toggleChat = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (newState) {
            setActiveOffer(null);
            if (hasStarted) {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('cove_chat_open', String(newState));
        }
    };

    // Load persisted state - Restore chat if returning from Auth
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const shouldRestore = localStorage.getItem('cove_chat_should_restore');
            if (shouldRestore === 'true') {
                setIsOpen(true);
                setHasStarted(true);

                // Only clear the flag if we are NOT on an auth page, so it persists for the return trip
                const isAuthPage = window.location.pathname.includes('/sign-in') || window.location.pathname.includes('/sign-up');
                if (!isAuthPage) {
                    localStorage.removeItem('cove_chat_should_restore');
                }
            }
        }
    }, []);

    // Persist hasStarted per session
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sessionStarted = sessionStorage.getItem('cove_chat_started');
            if (sessionStarted === 'true') {
                setHasStarted(true);
            }
        }
    }, []);

    const handleStartChatting = () => {
        // Unconditionally start (handles both authenticated and "Skip for now")
        setHasStarted(true);
        sessionStorage.setItem('cove_chat_started', 'true');
        setTimeout(() => inputRef.current?.focus(), 300);
    };

    // Removed: showAuthOptions state - guests can now chat directly

    // Auth Handlers - Now using Auth Modal
    const handleSignIn = () => {
        openAuthModal('sign-in', pathname || '/');
    };

    const handleSignUp = () => {
        openAuthModal('sign-up', pathname || '/');
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() && !uploadedImage) return;

        if (chatWidgetRef.current) {
            chatWidgetRef.current.sendQuickMessage(inputValue.trim(), uploadedImage?.file);
        }
        setInputValue("");
        setUploadedImage(null);
    };

    const handleQuickAction = (text: string) => {
        if (chatWidgetRef.current) {
            chatWidgetRef.current.sendQuickMessage(text);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be less than 5MB");
            return;
        }
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

    const canSend = inputValue.trim().length > 0 || uploadedImage !== null;

    return (
        <>
            <ProactiveBubble
                message={activeOffer?.message || ""}
                isVisible={!!activeOffer && !isOpen}
                onOpen={() => {
                    setIsOpen(true);
                    setActiveOffer(null);
                    setHasStarted(true);
                }}
                onDismiss={() => setActiveOffer(null)}
            />

            {/* OutfitModal removed - outfits now shown only in the Outfit Builder tab */}

            {/* Launcher (When Closed) */}
            {!isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="fixed z-[999] bottom-6 right-6 cursor-pointer"
                    onClick={toggleChat}
                >
                    <BubblesStatusPill
                        isThinking={isThinking}
                        thinkingSteps={thinkingSteps}
                    />
                </motion.div>
            )}

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Minimized Pill - Only show when minimized */}
                        <AnimatePresence>
                            {isMinimized && (
                                <motion.div
                                    key="minimized-pill"
                                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className="fixed z-[999] bottom-6 right-6 cursor-pointer"
                                    onClick={() => setIsMinimized(false)}
                                >
                                    <BubblesStatusPill
                                        isThinking={isThinking}
                                        thinkingSteps={thinkingSteps}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Full Chat - Keep mounted but hide when minimized to preserve state */}
                        <motion.div
                            key="full-chat"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{
                                opacity: isMinimized ? 0 : 1,
                                scale: isMinimized ? 0.9 : 1,
                                y: isMinimized ? 20 : 0,
                                pointerEvents: isMinimized ? 'none' : 'auto'
                            }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                            className={`fixed z-[999] bottom-6 right-6 w-[90vw] md:w-[380px] h-[75vh] md:h-[750px] max-h-[900px] max-w-[380px] rounded-2xl bg-neutral-100 shadow-2xl border border-gray-200 overflow-hidden flex flex-col ${isMinimized ? 'invisible' : 'visible'}`}
                        >
                            {/* Header - Minimal Top Bar */}
                            <div className="h-11 flex items-center justify-between px-4 relative z-50 shrink-0 bg-transparent">
                                <div className="flex items-center">
                                    <button
                                        onClick={() => {
                                            if (activeView !== 'chat') {
                                                setActiveView('chat');
                                            } else {
                                                setHasStarted(false);
                                            }
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-800 hover:text-black"
                                        title="Back"
                                    >
                                        <ArrowLeft className="h-5 w-5" strokeWidth={2} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-0.5">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowMenu(!showMenu)}
                                            className={`p-2 rounded-full transition-colors ${showMenu ? 'bg-gray-100 text-black' : 'hover:bg-gray-100 text-gray-700 hover:text-black'}`}
                                            title="Options"
                                        >
                                            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
                                        </button>

                                        <AnimatePresence>
                                            {showMenu && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-[90]"
                                                        onClick={() => setShowMenu(false)}
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        transition={{ duration: 0.1 }}
                                                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[100] origin-top-right overflow-hidden"
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                chatWidgetRef.current?.clearChat();
                                                                setShowMenu(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                            Clear Chat
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setHasStarted(false);
                                                                setShowMenu(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                                        >
                                                            <LogOut className="w-4 h-4" />
                                                            End Session
                                                        </button>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <button
                                        onClick={() => setIsMinimized(true)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 hover:text-black"
                                        title="Minimize"
                                    >
                                        <Minus className="h-5 w-5" strokeWidth={2} />
                                    </button>
                                </div>
                            </div>

                            {/* Bubbles Status Pill - Floating below header */}
                            <div className="absolute top-12 left-0 right-0 z-50 flex justify-center pointer-events-none">
                                <div className="pointer-events-auto">
                                    <BubblesStatusPill
                                        className="-mt-4"
                                        isThinking={isThinking}
                                        thinkingSteps={thinkingSteps}
                                    />
                                </div>
                            </div>

                            {/* Neutral gradient fade zone from top */}
                            <div
                                className="absolute top-0 left-0 right-0 h-20 z-30 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(to bottom, rgba(235,235,235,1) 0%, rgba(240,240,240,0.95) 40%, rgba(245,245,245,0.7) 70%, rgba(245,245,245,0) 100%)',
                                    backdropFilter: 'blur(4px)'
                                }}
                            />

                            {/* Main Content Area */}
                            <div className="flex-1 min-h-0 relative overflow-hidden">

                                {/* View 1: Welcome/Start Screen (If not started) */}
                                <AnimatePresence>
                                    {!hasStarted && (
                                        <motion.div
                                            key="welcome-screen"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                                            transition={{ duration: 0.4 }}
                                            className="absolute inset-0 z-40 bg-white flex flex-col items-center justify-center p-8 text-center"
                                        >
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.1 }}
                                                className="w-24 h-24 mb-6 rounded-full bg-black flex items-center justify-center shadow-xl"
                                            >
                                                <span className="text-white text-5xl font-bold">B</span>
                                            </motion.div>

                                            <motion.h2
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="text-2xl font-bold text-gray-900 mb-3"
                                            >
                                                Hi, I'm Bubbles!
                                            </motion.h2>

                                            <motion.p
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="text-gray-500 mb-8 leading-relaxed"
                                            >
                                                Your personal shopping assistant. 🫧 <br />
                                                I'm here to help you browse, style, and find the perfect look.
                                            </motion.p>

                                            <motion.button
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                                onClick={handleStartChatting}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="px-8 py-3 bg-black text-white rounded-full font-semibold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                                            >
                                                Start Chatting
                                                <MessageCircle className="w-4 h-4" />
                                            </motion.button>

                                            {/* Non-blocking sign-in option for guests */}
                                            {!isSignedIn && (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.6 }}
                                                    className="mt-4 text-sm text-gray-400"
                                                >
                                                    Have an account?{' '}
                                                    <button
                                                        onClick={handleSignIn}
                                                        className="text-gray-600 underline hover:text-black transition-colors"
                                                    >
                                                        Sign in
                                                    </button>
                                                </motion.p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* View 2: Active Chat Interface */}
                                <div className={`h-full ${!hasStarted ? 'invisible' : 'visible'}`}>
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
                                                if (tab === 'outfit_builder') setHasOutfitReady(false);
                                            }}
                                            onOutfitReady={() => setHasOutfitReady(true)}
                                            uploadedImage={uploadedImage}
                                            onTriggerImageUpload={() => fileInputRef.current?.click()}
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

                            {/* Input Area - Springs up when hasStarted */}
                            <AnimatePresence>
                                {hasStarted && (
                                    <motion.form
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.2 }}
                                        onSubmit={handleSubmit}
                                        className="px-4 py-3 bg-neutral-100"
                                    >
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

                                            {/* Send Button - Green styling */}
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
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            {/* View Mode Tabs - Bottom Pills */}
                            <div className="px-4 py-2 bg-neutral-100">
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
                            <div className="border-t border-gray-200 py-2 px-4 text-center bg-white">
                                <span className="text-xs text-gray-400">
                                    Powered by <span className="text-gray-600 font-medium">🫧 CoveAI</span>
                                </span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence >
        </>
    );
}
