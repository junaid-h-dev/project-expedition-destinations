import type { Metadata } from "next";
import { DestinationTable } from "@/components/destination-explorer/destination-table";
import { Filters } from "@/components/destination-explorer/filters";
import {
  explorerStateFromSearchParams,
  explorerStateToListQuery,
} from "@/destinations/explorer-state";
import { listDestinations, listRegions } from "@/destinations/repository";

export const metadata: Metadata = { title: "Destinations" };

/**
 * Browse the destination catalogue.
 *
 * The URL is the only state: search, filters, sort, direction and page live in
 * the query string, so a view is bookmarkable and survives a reload. This server
 * component normalises those parameters, runs one paginated query through the
 * same repository the API uses, and renders the result; the client-side part is
 * limited to the controls that change the URL.
 */
export default async function DestinationExplorerPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const regions = await listRegions();
  const state = explorerStateFromSearchParams(searchParams, regions);
  const page = await listDestinations(explorerStateToListQuery(state));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Project Expedition Destinations
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Browse, search and compare the destinations we offer.
          </p>
        </div>
        <p className="text-sm text-gray-600" aria-live="polite">
          {page.total === 0
            ? "No destinations to show"
            : `Showing ${page.from}–${page.to} of ${page.total} destinations`}
        </p>
      </header>

      <Filters state={state} regions={regions} />

      <DestinationTable page={page} state={state} />
    </div>
  );
}
