// src/components/ui/ErrorState.tsx
"use client";

import React from "react";
import clsx from "clsx";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  /** Optional CTA text for the retry button */
  retryLabel?: string;
};

export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn’t load this section.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-red-300 bg-red-50 p-4 text-red-700",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="font-medium">{title}</div>
      {message ? <div className="mt-1 text-sm">{message}</div> : null}
      {onRetry ? (
        <button
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm hover:bg-red-50"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
