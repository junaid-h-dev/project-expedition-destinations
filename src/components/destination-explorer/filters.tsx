"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { explorerHref, type ExplorerState, hasActiveFilters } from "@/destinations/explorer-state";
import { COST_LEVELS, isCostLevel } from "@/domain/cost-level";
import { MAX_SEARCH_LENGTH } from "@/domain/search";

interface Props {
  state: ExplorerState;
  regions: string[];
}

export const SEARCH_DEBOUNCE_MS = 300;

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500";

/**
 * The search box and filter selects. The URL is the source of truth: every change
 * navigates to the new query string (replacing history so the back button is not
 * spammed) and the server re-renders the list. Typing is debounced; selects apply
 * immediately. `useTransition` gives us a pending flag for the "Updating…" hint.
 */
export function Filters({ state, regions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(state.search);
  // The term the URL held at the last render, and the one we last navigated to.
  // They diverge while a navigation is in flight, which is what tells our own
  // (possibly slow) navigations apart from a URL change made somewhere else.
  const [urlSearch, setUrlSearch] = useState(state.search);
  const [requestedSearch, setRequestedSearch] = useState(state.search);

  if (state.search !== urlSearch) {
    setUrlSearch(state.search);

    // Adopt the new term only when it came from outside this component — the back
    // button, a sort link, server normalisation — and nothing of ours is in flight.
    // Otherwise a navigation landing would overwrite what is being typed.
    // Deriving state during render is React's pattern for "reset on prop change".
    if (state.search !== requestedSearch && !isPending) {
      setRequestedSearch(state.search);
      setSearch(state.search);
    }
  }

  useEffect(() => {
    if (search === requestedSearch) {
      return;
    }

    const timer = setTimeout(() => {
      setRequestedSearch(search);
      startTransition(() => {
        router.replace(explorerHref({ ...state, search, page: 1 }), { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search, requestedSearch, state, router]);

  // Selects apply at once, carrying whatever is in the search box so a term still
  // inside its debounce window is not lost when a filter changes.
  const apply = (changes: Partial<ExplorerState>) => {
    const next = { ...state, search, ...changes, page: 1 };

    setRequestedSearch(next.search);
    startTransition(() => {
      router.replace(explorerHref(next), { scroll: false });
    });
  };

  const showClear = hasActiveFilters(state);

  return (
    <section
      aria-label="Search and filters"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div className="lg:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value.slice(0, MAX_SEARCH_LENGTH))}
            placeholder="Name, country, region or activity"
            maxLength={MAX_SEARCH_LENGTH}
            autoComplete="off"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="region" className="block text-sm font-medium text-gray-700">
            Region
          </label>
          <select
            id="region"
            value={state.region}
            onChange={(event) => apply({ region: event.target.value })}
            className={inputClass}
          >
            <option value="">All regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cost-level" className="block text-sm font-medium text-gray-700">
            Cost level
          </label>
          <select
            id="cost-level"
            value={state.costLevel}
            onChange={(event) =>
              apply({ costLevel: isCostLevel(event.target.value) ? event.target.value : "" })
            }
            className={inputClass}
          >
            <option value="">All cost levels</option>
            {COST_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex min-h-5 items-center justify-between text-sm">
        {/* Always rendered, so only the text changes: a live region has to exist
            before the update for a screen reader to announce it. */}
        <span role="status" className="text-gray-500">
          {isPending ? "Updating…" : ""}
        </span>
        {showClear && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              apply({ search: "", region: "", costLevel: "" });
            }}
            className="ml-auto rounded font-medium text-indigo-600 hover:text-indigo-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
