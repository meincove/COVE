'use client'

import { AlertTriangle, Trash2, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface DeleteAlertModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title?: string
    description?: string
    confirmText?: string
}

export default function DeleteAlertModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Move to Recycle Bin?",
    description = "This product will be moved to the Recycle Bin. You can restore it later if needed.",
    confirmText = "Yes, move to bin"
}: DeleteAlertModalProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 overflow-hidden"
                >
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            {description}
                        </p>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    onConfirm()
                                }}
                                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
