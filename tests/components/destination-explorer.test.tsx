import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DestinationExplorer, { type Destination } from "@/components/DestinationExplorer";

const destinations: Destination[] = [
  {
    name: "Kyoto",
    country: "Japan",
    region: "Asia",
    cost_level: "Moderate",
    activities: ["Cultural Tours"],
    average_daily_budget: 180,
    annual_visitors: 5300000,
  },
];

describe("<DestinationExplorer /> (prototype)", () => {
  it("lists the destinations it is given", () => {
    render(<DestinationExplorer destinations={destinations} />);

    expect(screen.getAllByRole("row")).toHaveLength(2); // 1 destination + the header
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
  });
});
