import Link from "next/link";
import { type ExplorerState, hasActiveFilters } from "@/destinations/explorer-state";
import type { Page } from "@/destinations/repository";
import type { Destination } from "@/domain/destination";
import { ActivityList } from "./activity-list";
import { CostLevelBadge } from "./cost-level-badge";
import { Pagination } from "./pagination";
import { SortableHeading } from "./sortable-heading";

interface Props {
  page: Page<Destination>;
  state: ExplorerState;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("en-US");

export function DestinationTable({ page, state }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Focusable and labelled: on a narrow screen this scrolls sideways, and a
          keyboard user needs to be able to reach it to scroll it. */}
      <div
        role="region"
        aria-label="Destinations"
        tabIndex={0}
        className="overflow-x-auto focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
      >
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <SortableHeading field="name" state={state} />
              <SortableHeading field="country" state={state} />
              <SortableHeading field="region" state={state} />
              <SortableHeading field="cost_level" state={state} />
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-600 uppercase"
              >
                Activities
              </th>
              <SortableHeading field="average_daily_budget" state={state} align="right" />
              <SortableHeading field="annual_visitors" state={state} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {page.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  {hasActiveFilters(state) ? (
                    <>
                      <p className="font-medium text-gray-700">
                        No destinations match your search.
                      </p>
                      <p className="mt-1 text-sm">
                        Try a different term or{" "}
                        <Link
                          href="/"
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          clear the filters
                        </Link>
                        .
                      </p>
                    </>
                  ) : (
                    // Nothing is filtered, so the catalogue itself is empty — which on a
                    // fresh install means the seeder has not run yet.
                    <>
                      <p className="font-medium text-gray-700">The catalogue is empty.</p>
                      <p className="mt-1 text-sm">
                        Load the destinations with <code>npm run db:seed</code>.
                      </p>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              page.data.map((destination) => (
                <tr key={destination.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{destination.name}</td>
                  <td className="px-4 py-3 text-gray-700">{destination.country}</td>
                  <td className="px-4 py-3 text-gray-700">{destination.region}</td>
                  <td className="px-4 py-3">
                    <CostLevelBadge level={destination.costLevel} />
                  </td>
                  <td className="px-4 py-3">
                    <ActivityList activities={destination.activities} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                    {currency.format(destination.averageDailyBudget)}
                    <span className="text-gray-400">/day</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                    {number.format(destination.annualVisitors)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} state={state} />
    </div>
  );
}
