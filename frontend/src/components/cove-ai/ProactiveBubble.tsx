import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

interface ProactiveBubbleProps {
    message: string;
    isVisible: boolean;
    onOpen: () => void;
    onDismiss: () => void;
}

export default function ProactiveBubble({ message, isVisible, onOpen, onDismiss }: ProactiveBubbleProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-20 right-0 z-50 max-w-xs w-72 mr-4 md:mr-0"
                >
                    <div
                        className="relative bg-white dark:bg-zinc-800 shadow-xl rounded-2xl p-4 border border-indigo-100 dark:border-zinc-700 cursor-pointer hover:scale-[1.02] transition-transform"
                        onClick={onOpen}
                    >
                        {/* Close Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                            className="absolute -top-2 -right-2 bg-white dark:bg-zinc-700 text-zinc-400 hover:text-zinc-600 rounded-full p-1 shadow-sm border border-zinc-100"
                        >
                            <X size={14} />
                        </button>

                        <div className="flex items-start gap-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full p-2 text-white shrink-0 mt-1">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {/* Parse bold markdown manually or use a lib? Simplified for now */}
                                    <span dangerouslySetInnerHTML={{ __html: message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                                </p>
                                <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold group flex items-center gap-1">
                                    Click to view offer →
                                </div>
                            </div>
                        </div>

                        {/* Pointer Triangle */}
                        <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-zinc-800 transform rotate-45 border-b border-r border-indigo-100 dark:border-zinc-700"></div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
