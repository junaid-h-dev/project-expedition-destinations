import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Filters, SEARCH_DEBOUNCE_MS } from "@/components/destination-explorer/filters";
import type { ExplorerState } from "@/destinations/explorer-state";

const replace = vi.fn();
const router = { replace, push: vi.fn(), refresh: vi.fn() };

// A stable router object, as in production, so effect dependencies do not churn.
vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const baseState: ExplorerState = {
  search: "",
  region: "",
  costLevel: "",
  sort: "name",
  direction: "asc",
  page: 3,
};
const regions = ["Asia", "Europe"];

describe("<Filters />", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces typing and navigates with the term, back on page one", () => {
    render(<Filters state={baseState} regions={regions} />);

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "per" } });
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "peru" } });

    expect(replace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/?q=peru", { scroll: false });
  });

  it("keeps what is being typed while a navigation is in flight", () => {
    const { rerender } = render(<Filters state={baseState} regions={regions} />);

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "peru" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    // The navigation has been requested but the server has not answered, so the
    // props still hold the old term. The box must not be reset to it.
    expect(replace).toHaveBeenCalledWith("/?q=peru", { scroll: false });
    expect(screen.getByLabelText("Search")).toHaveValue("peru");

    // The user types on, and only then does the earlier navigation land.
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "peruvian" } });
    rerender(<Filters state={{ ...baseState, search: "peru" }} regions={regions} />);

    expect(screen.getByLabelText("Search")).toHaveValue("peruvian");

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(replace).toHaveBeenLastCalledWith("/?q=peruvian", { scroll: false });
  });

  it("carries a term still inside its debounce window when a select changes", () => {
    render(<Filters state={baseState} regions={regions} />);

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "peru" } });
    fireEvent.change(screen.getByLabelText("Region"), { target: { value: "Asia" } });

    expect(replace).toHaveBeenCalledWith("/?q=peru&region=Asia", { scroll: false });

    // The pending timer must not fire a second navigation for the same term.
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("applies select changes immediately and keeps the other filters", () => {
    render(
      <Filters
        state={{ ...baseState, search: "kyoto", sort: "country", direction: "desc" }}
        regions={regions}
      />,
    );

    fireEvent.change(screen.getByLabelText("Region"), { target: { value: "Asia" } });

    expect(replace).toHaveBeenCalledWith("/?q=kyoto&region=Asia&sort=country&direction=desc", {
      scroll: false,
    });

    fireEvent.change(screen.getByLabelText("Cost level"), { target: { value: "Budget" } });

    expect(replace).toHaveBeenLastCalledWith("/?q=kyoto&cost=Budget&sort=country&direction=desc", {
      scroll: false,
    });
  });

  it("shows the current state in the controls and offers to clear it", () => {
    render(
      <Filters
        state={{ ...baseState, search: "bali", region: "Asia", costLevel: "Budget" }}
        regions={regions}
      />,
    );

    expect(screen.getByLabelText("Search")).toHaveValue("bali");
    expect(screen.getByLabelText("Region")).toHaveValue("Asia");
    expect(screen.getByLabelText("Cost level")).toHaveValue("Budget");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
  });

  it("adopts a search term that arrives from the URL without navigating again", () => {
    const { rerender } = render(<Filters state={baseState} regions={regions} />);

    // A sort link or the back button changed the URL: the box follows, no extra navigation.
    rerender(<Filters state={{ ...baseState, search: "kyoto" }} regions={regions} />);

    expect(screen.getByLabelText("Search")).toHaveValue("kyoto");

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(replace).not.toHaveBeenCalled();
  });

  it("hides the clear button when nothing is filtered and caps the search length", () => {
    render(<Filters state={baseState} regions={regions} />);

    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "k".repeat(150) } });

    expect(screen.getByLabelText("Search")).toHaveValue("k".repeat(100));
  });
});
