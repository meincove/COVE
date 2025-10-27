// src/components/ui/LoadingState.tsx
"use client";

import React from "react";
import clsx from "clsx";

type LoadingStateProps = {
  /** Optional heading shown above the skeletons/spinner */
  title?: string;
  /** Optional helper text under the title */
  subtitle?: string;
  /** Number of skeleton rows to render (set 0 to hide) */
  rows?: number;
  /** If true, show a small spinner instead of skeleton rows */
  spinner?: boolean;
  /** Additional class names for outer container */
  className?: string;
};

export default function LoadingState({
  title = "Loading…",
  subtitle,
  rows = 3,
  spinner = false,
  className,
}: LoadingStateProps) {
  return (
    <div className={clsx("w-full", className)}>
      <div className="mb-3">
        <h2 className="text-base font-medium text-gray-800">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>

      {spinner ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          Please wait…
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      )}
    </div>
  );
}
