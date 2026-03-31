import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Wand2, Sparkles, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStream } from '@/hooks/useAgentStream';

interface VTOModalProps {
    isOpen: boolean;
    onClose: () => void;
    productImage: string;
    productTitle: string;
}

type VTOState = 'check-image' | 'upload' | 'generating' | 'result' | 'error';

const VTOModal: React.FC<VTOModalProps> = ({ isOpen, onClose, productImage, productTitle }) => {
    const [step, setStep] = useState<VTOState>('check-image');
    const [userImage, setUserImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Agent Stream Hook
    const { sendQuery, isStreaming, error: streamError, vto_image_url, kind } = useAgentStream();

    // Effect: Handle Stream Results
    useEffect(() => {
        if (!isOpen) return;

        // Success Case: VTO Image URL received
        if (vto_image_url) {
            console.log("VTO Success:", vto_image_url);
            setGeneratedImage(vto_image_url);
            setStep('result');
        }
        // Success Case: Fallback if no specific url but kind matches (mocking)
        else if (kind === 'recommendations' && !isStreaming && step === 'generating') {
            // If streaming finished but no vto_url found, check if maybe it's in items? 
            // For now, if we don't have vto_url, it's an error unless handled.
            // But wait, if backend mocked it, it sent vto_image_url.
        }

        // Error Case
        if (streamError) {
            setErrorMessage(streamError);
            setStep('error');
        }
    }, [vto_image_url, streamError, kind, isStreaming, isOpen]);


    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            const storedImage = localStorage.getItem('cove_vto_user_image');
            if (storedImage) {
                setUserImage(storedImage);
                setStep('check-image');
            } else {
                setStep('upload');
            }
            setGeneratedImage(null);
            setErrorMessage(null);
        }
    }, [isOpen]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setUserImage(result);
                localStorage.setItem('cove_vto_user_image', result);
                setStep('check-image');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!userImage) return;
        setStep('generating');
        setErrorMessage(null);

        try {
            await sendQuery(
                "Generate VTO for " + productTitle,
                undefined, // userId
                undefined, // sessionId
                "virtual_try_on", // sessionType - Force VTO workflow
                productImage, // imageUrl (Garment)
                userImage // imageData (User Photo)
            );
        } catch (e) {
            setErrorMessage("Failed to start generation.");
            setStep('error');
        }
    };

    const PlusIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center relative"
                style={{ width: '90%', height: '70%' }}
            >
                {/* Header */}
                <div className="w-full h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-800">Virtual Try-On</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 w-full p-8 flex items-center justify-center bg-gray-50">
                    <AnimatePresence mode='wait'>

                        {/* Step 1: Upload / Confirm Image */}
                        {step === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center text-center max-w-md"
                            >
                                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                                    <Upload className="w-10 h-10 text-purple-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Photo</h2>
                                <p className="text-gray-500 mb-8">
                                    To see how this looks on you, we need a full-body photo.
                                    Ensure good lighting for the best results!
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                                >
                                    Select Photo
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </motion.div>
                        )}

                        {step === 'check-image' && userImage && (
                            <motion.div
                                key="check"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center w-full h-full"
                            >
                                <div className="flex gap-8 items-center h-full">
                                    {/* User Photo */}
                                    <div className="relative group">
                                        <img src={userImage} alt="You" className="h-64 md:h-80 object-cover rounded-xl shadow-md border-2 border-white" />
                                        <button
                                            onClick={() => setStep('upload')}
                                            className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-full shadow-sm text-xs font-bold hover:bg-white text-gray-600"
                                        >
                                            Change
                                        </button>
                                        <p className="mt-4 text-center font-medium text-gray-600">Your Photo</p>
                                    </div>

                                    <div className="text-gray-300">
                                        <PlusIcon />
                                    </div>

                                    {/* Product Photo */}
                                    <div>
                                        <img src={productImage} alt="Product" className="h-64 md:h-80 object-contain p-4 bg-white rounded-xl shadow-md border-2 border-white" />
                                        <p className="mt-4 text-center font-medium text-gray-600">Selected Item</p>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={handleGenerate}
                                        className="px-8 py-3 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center gap-2 text-lg"
                                    >
                                        <Wand2 className="w-5 h-5" />
                                        Generate Try-On
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 5: Error */}
                        {step === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center text-center text-red-500"
                            >
                                <h3 className="text-xl font-bold mb-2">Generation Failed</h3>
                                <p className="text-gray-600 mb-6">{errorMessage}</p>
                                <button
                                    onClick={() => setStep('check-image')}
                                    className="px-6 py-2 bg-gray-100 rounded-full text-black font-medium"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        )}

                        {/* Step 3: Generating */}
                        {step === 'generating' && (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center text-center"
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                                    <Loader2 className="w-16 h-16 text-purple-600 animate-spin relative z-10" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">Magic in Progress...</h3>
                                <p className="text-gray-500">We're stitching this look just for you.</p>
                            </motion.div>
                        )}

                        {/* Step 4: Result */}
                        {step === 'result' && generatedImage && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center h-full w-full"
                            >
                                <div className="relative h-full w-full max-h-[400px] flex items-center justify-center">
                                    <img src={generatedImage} alt="Result" className="h-full object-contain rounded-lg shadow-lg" />
                                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Ready
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-8">
                                    <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium">
                                        Close
                                    </button>
                                    <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium shadow-lg">
                                        Add to Outfit
                                    </button>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default VTOModal;
