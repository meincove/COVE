import React, { useState, useRef, useEffect, FormEvent } from "react";
import { MoreHorizontal, RefreshCw, LogOut, Maximize2, Minimize2, Plus, Smile, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CoveChatWidget from '@/components/cove-ai/CoveChatWidget';
import BubblesStatusPill from "@/components/cove-ai/BubblesStatusPill";

const ChatInterface: React.FC = () => {
    // Layout State
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(400);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);

    // Chat State
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState<Array<{ icon: string; status: string; done?: boolean }>>([]);
    const [showMenu, setShowMenu] = useState(false);

    // Input State
    const [inputValue, setInputValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Widget Ref
    const chatWidgetRef = useRef<{ sendQuickMessage: (msg: string, image?: File) => void; clearChat: () => void }>(null);

    // Resize Observer to detect panel width
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                setContainerWidth(width);

                // Auto-collapse if width is too small (e.g., < 320px)
                if (width < 340) {
                    setIsCollapsed(true);
                } else if (!isManuallyCollapsed) {
                    setIsCollapsed(false);
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isManuallyCollapsed]);

    // Handle "Focus/Type to Expand"
    const handleCollapsedInputFocus = () => {
        setIsCollapsed(false);
        setIsManuallyCollapsed(false);
        // We might want to auto-focus the real widget input here? 
        // Logic: Wait for expansion animation then focus.
        setTimeout(() => {
            inputRef.current?.focus();
        }, 300);
    };

    const handleQuickAction = (text: string) => {
        if (text === 'minimize') {
            setIsManuallyCollapsed(true);
            setIsCollapsed(true);
            return;
        }
        chatWidgetRef.current?.sendQuickMessage(text);
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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
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
        <div ref={containerRef} className="h-full w-full relative pointer-events-none flex flex-col justify-end overflow-hidden">

            <AnimatePresence mode="wait">
                {/* EXPANDED VIEW (85% Height) */}
                {!isCollapsed && (
                    <motion.div
                        key="expanded-chat"
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="w-full h-[85%] bg-white rounded-t-2xl shadow-xl border border-gray-200 flex flex-col relative pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-100 bg-white rounded-t-2xl z-20 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                                    <span className="text-white text-md font-bold">B</span>
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="font-semibold text-sm text-gray-800 leading-none">Cove Stylist</h2>
                                    {isThinking && <span className="text-[10px] text-blue-500 animate-pulse mt-0.5">Thinking...</span>}
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        setIsManuallyCollapsed(true);
                                        setIsCollapsed(true);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition"
                                    title="Minimize"
                                >
                                    <Minimize2 className="h-4 w-4" />
                                </button>

                                <div className="relative">
                                    <button
                                        onClick={() => setShowMenu(!showMenu)}
                                        className={`p-2 rounded-full transition-colors ${showMenu ? 'bg-gray-100 text-black' : 'hover:bg-gray-100 text-gray-700 hover:text-black'}`}
                                    >
                                        <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
                                    </button>

                                    <AnimatePresence>
                                        {showMenu && (
                                            <>
                                                <div className="fixed inset-0 z-[90]" onClick={() => setShowMenu(false)} />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[100] origin-top-right overflow-hidden"
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
                                                            chatWidgetRef.current?.clearChat();
                                                            setShowMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                                    >
                                                        <LogOut className="w-4 h-4" />
                                                        Reset
                                                    </button>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 relative overflow-hidden">
                            <CoveChatWidget
                                ref={chatWidgetRef}
                                mode="outfit_builder"
                                onThinkingChange={(thinking, steps) => {
                                    setIsThinking(thinking);
                                    setThinkingSteps(steps || []);
                                }}
                                onQuickAction={handleQuickAction}
                            />
                        </div>

                        {/* Uploaded Image Preview */}
                        <AnimatePresence>
                            {uploadedImage && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 py-2 border-t border-gray-100 bg-gray-50"
                                >
                                    <div className="relative inline-block">
                                        <img src={uploadedImage.preview} alt="Upload" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                                        <button onClick={removeUploadedImage} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-sm">×</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Input Area */}
                        <form onSubmit={handleSubmit} className="px-4 py-3 bg-white border-t border-gray-100">
                            <div className={`flex items-center gap-2 rounded-full px-4 py-2 border-2 transition-colors ${isFocused ? 'bg-white border-green-400 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                    <Plus className="h-5 w-5 text-gray-400" />
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Describe your outfit idea..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
                                />

                                <button type="button" className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                    <Smile className="h-5 w-5 text-gray-400" />
                                </button>

                                <motion.button
                                    type="submit"
                                    disabled={!canSend}
                                    className="flex items-center justify-center rounded-full transition-all"
                                    animate={{ backgroundColor: canSend ? '#22c55e' : 'transparent', width: 32, height: 32, borderWidth: canSend ? 0 : 2 }}
                                    style={{ borderColor: '#22c55e' }}
                                >
                                    <ArrowUp className={`transition-colors ${canSend ? 'text-white' : 'text-green-500'} h-4 w-4`} />
                                </motion.button>
                            </div>
                        </form>
                        <div className="py-2 text-center bg-gray-50 border-t border-gray-100 rounded-b-none">
                            <span className="text-[10px] text-gray-400">Powered by <span className="text-gray-600 font-medium">🫧 CoveAI</span></span>
                        </div>
                    </motion.div>
                )}

                {/* COLLAPSED VIEW (Floating Textarea Pill) */}
                {isCollapsed && (
                    <motion.div
                        key="collapsed-pill"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-6 left-0 right-0 px-4 flex flex-col items-center gap-3 z-50 pointer-events-none"
                    >
                        {/* Status Pill (Only if thinking) */}
                        {(isThinking || thinkingSteps.length > 0) && (
                            <div className="pointer-events-auto">
                                <BubblesStatusPill isThinking={isThinking} thinkingSteps={thinkingSteps} />
                            </div>
                        )}

                        {/* Interactive Input Pill */}
                        <div className="pointer-events-auto w-full max-w-sm">
                            <div
                                onClick={handleCollapsedInputFocus}
                                className="bg-white rounded-full shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3 cursor-text hover:border-gray-300 transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0">
                                    <span className="text-white text-sm font-bold">B</span>
                                </div>
                                <span className="text-gray-400 text-sm group-hover:text-gray-500 transition-colors select-none">
                                    Ask Bubbles for ideas...
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatInterface;
