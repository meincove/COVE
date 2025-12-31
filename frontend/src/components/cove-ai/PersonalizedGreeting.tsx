// src/components/cove-ai/PersonalizedGreeting.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { Sparkles, UserPlus, TrendingUp } from "lucide-react";

export default function PersonalizedGreeting() {
    const { isSignedIn, user, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="p-6 animate-pulse">
                <div className="h-4 w-32 bg-neutral-800 rounded mb-2"></div>
                <div className="h-3 w-48 bg-neutral-800 rounded"></div>
            </div>
        );
    }

    // Signed-in personalized greeting
    if (isSignedIn && user) {
        const firstName = user.firstName || user.username || "there";

        return (
            <div className="p-6 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 border-b border-white/5">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-white mb-1">
                            Welcome back, {firstName}! ✨
                        </h3>
                        <p className="text-sm text-neutral-300 leading-relaxed">
                            I'm your personal AI stylist. I can help you discover products, track orders,
                            find the perfect fit, and create amazing outfits. What would you like to explore today?
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Guest - prompt to sign in with quick action buttons
    return (
        <div className="p-4 bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border-b border-white/5">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-700 flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-neutral-300" />
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-semibold text-white mb-1">
                        Hey there! 👋
                    </h3>
                    <p className="text-sm text-neutral-300 leading-relaxed">
                        I'm Cove AI, your personal shopping assistant!
                    </p>

                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 mt-2 mb-2">
                        <div className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-purple-200">
                                <span className="font-semibold">Sign in to unlock:</span> Personalized recommendations,
                                order tracking, and exclusive benefits!
                            </p>
                        </div>
                    </div>

                    <SignInButton mode="modal">
                        <button className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50">
                            Sign In to Get Started
                        </button>
                    </SignInButton>

                    <p className="text-xs text-neutral-500 mt-1.5 text-center">
                        Or continue browsing as a guest
                    </p>
                </div>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-xs text-neutral-400 mb-2">Try one of these to get started:</p>
                <div className="flex flex-wrap gap-2">
                    {[
                        { emoji: "✨", text: "Show me trending styles" },
                        { emoji: "🧥", text: "I need a hoodie" },
                        { emoji: "👕", text: "Looking for tees" },
                        { emoji: "🎨", text: "Surprise me!" }
                    ].map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                // Find the input and set its value, then submit
                                const input = document.querySelector('input[placeholder*="Ask Cove"]') as HTMLInputElement;
                                const form = document.querySelector('form') as HTMLFormElement;
                                if (input && form) {
                                    input.value = item.text;
                                    // Trigger React's onChange
                                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                                    nativeInputValueSetter?.call(input, item.text);
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    setTimeout(() => form.requestSubmit(), 50);
                                }
                            }}
                            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs text-neutral-300 hover:text-white transition-all"
                        >
                            {item.emoji} {item.text}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
