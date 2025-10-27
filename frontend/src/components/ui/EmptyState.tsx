// src/components/ui/EmptyState.tsx
"use client";

import React from "react";
import Link from "next/link";
import clsx from "clsx";

type EmptyStateProps = {
  title?: string;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

export default function EmptyState({
  title = "Nothing here yet",
  message = "There’s no data to show.",
  actionHref,
  actionLabel = "Go back",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border p-6 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto mb-3 h-10 w-10 rounded-full border border-gray-300" />
      <p className="text-gray-800">{title}</p>
      {message ? <p className="text-sm text-gray-500 mt-1">{message}</p> : null}
      {actionHref ? (
        <Link
          href={actionHref}
          className="mt-4 inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
