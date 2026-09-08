import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DestinationExplorer from "@/components/DestinationExplorer";

/**
 * Characterisation tests: they record what the prototype does today, including
 * the parts that are wrong, so the rewrite in Section 3 has something to answer to.
 */
describe("<DestinationExplorer /> (prototype)", () => {
  it("lists every destination it holds", () => {
    render(<DestinationExplorer />);

    expect(screen.getAllByRole("row")).toHaveLength(16); // 15 destinations + the header
    expect(screen.getByText("Machu Picchu")).toBeInTheDocument();
  });

  it("searches a keystroke behind, and only for an exact case", () => {
    render(<DestinationExplorer />);
    const input = screen.getByRole("textbox");

    // A browser fires keydown before the value changes, which is the order the
    // search runs in: it always sees the term as it was one keystroke ago.
    fireEvent.keyDown(input, { key: "o" });
    fireEvent.change(input, { target: { value: "Kyoto" } });
    expect(screen.getAllByRole("row")).toHaveLength(16); // 15 destinations + the header

    // The next keystroke finally applies the term typed before it.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByRole("row")).toHaveLength(2); // Kyoto + the header

    // And the match is case-sensitive, so the same word in lower case finds nothing.
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "kyoto" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByRole("row")).toHaveLength(1); // the header alone
  });
});
