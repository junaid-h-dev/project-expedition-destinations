import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DestinationTable } from "@/components/destination-explorer/destination-table";
import { SortableHeading } from "@/components/destination-explorer/sortable-heading";
import type { ExplorerState } from "@/destinations/explorer-state";
import type { Page } from "@/destinations/repository";
import type { Destination } from "@/domain/destination";

const state: ExplorerState = {
  search: "",
  region: "",
  costLevel: "",
  sort: "name",
  direction: "asc",
  page: 1,
};

const destination = (overrides: Partial<Destination>): Destination => ({
  id: 1,
  name: "Kyoto",
  country: "Japan",
  region: "Asia",
  costLevel: "Moderate",
  activities: ["Cultural Tours", "Photography"],
  averageDailyBudget: 180,
  annualVisitors: 5_300_000,
  createdAt: new Date("2026-09-06T00:00:00Z"),
  updatedAt: new Date("2026-09-06T00:00:00Z"),
  ...overrides,
});

const pageOf = (
  data: Destination[],
  overrides: Partial<Page<Destination>> = {},
): Page<Destination> => ({
  data,
  total: data.length,
  page: 1,
  perPage: 10,
  lastPage: 1,
  from: data.length ? 1 : null,
  to: data.length ? data.length : null,
  ...overrides,
});

describe("<SortableHeading />", () => {
  it("links to the sorted view and exposes the active sort", () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeading field="name" state={state} />
            <SortableHeading
              field="annual_visitors"
              state={{ ...state, search: "peru", page: 4 }}
              align="right"
            />
          </tr>
        </thead>
      </table>,
    );

    const [name, visitors] = screen.getAllByRole("columnheader");

    expect(name).toHaveAttribute("aria-sort", "ascending");
    expect(within(name).getByRole("link")).toHaveAttribute("href", "/?direction=desc");

    expect(visitors).toHaveAttribute("aria-sort", "none");
    // Switching column resets the direction and the page, and keeps the search.
    expect(within(visitors).getByRole("link")).toHaveAttribute(
      "href",
      "/?q=peru&sort=annual_visitors",
    );
  });
});

describe("<DestinationTable />", () => {
  it("renders rows with formatted figures and badges", () => {
    render(<DestinationTable page={pageOf([destination({})])} state={state} />);

    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("$180")).toBeInTheDocument();
    expect(screen.getByText("5,300,000")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("Cultural Tours")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("shows an empty state when nothing matches", () => {
    render(<DestinationTable page={pageOf([])} state={{ ...state, search: "atlantis" }} />);

    expect(screen.getByText("No destinations match your search.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "clear the filters" })).toHaveAttribute("href", "/");
  });

  it("paginates with previous/next links that keep the filters", () => {
    const data = [destination({ id: 1 }), destination({ id: 2, name: "Bali" })];
    render(
      <DestinationTable
        page={pageOf(data, { total: 25, page: 2, lastPage: 3, from: 11, to: 20 })}
        state={{ ...state, region: "Asia", page: 2 }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Pagination" });

    expect(within(nav).getByText(/Page 2 of 3/)).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/?region=Asia",
    );
    expect(within(nav).getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/?region=Asia&page=3",
    );
  });
});
