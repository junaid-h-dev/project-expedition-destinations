"use client";

import { useEffect } from "react";

/**
 * Error boundary for the page tree. The message stays generic on purpose — the
 * details go to the server log via Next.js — and `reset` re-renders the segment,
 * which is enough for transient failures such as a database restart.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-600">
        The destinations could not be loaded. Please try again in a moment.
        {error.digest ? (
          <span className="mt-1 block text-xs text-gray-400">Reference: {error.digest}</span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Try again
      </button>
    </div>
  );
}
