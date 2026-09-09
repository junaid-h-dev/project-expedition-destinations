import DestinationExplorer from "@/components/DestinationExplorer";
import { listDestinations } from "@/destinations/repository";

/**
 * The destinations now come from the database, through the same repository the
 * API uses, and are rendered on the server. The explorer component is still the
 * prototype — holding every row in client state, with its search and sorting
 * bugs — which is what Section 3 addresses.
 */
export default async function Home() {
  const page = await listDestinations({
    sort: "name",
    direction: "asc",
    page: 1,
    perPage: 100,
  });

  const destinations = page.data.map((destination) => ({
    name: destination.name,
    country: destination.country,
    region: destination.region,
    cost_level: destination.costLevel,
    activities: destination.activities,
    average_daily_budget: destination.averageDailyBudget,
    annual_visitors: destination.annualVisitors,
  }));

  return (
    <main style={{ padding: "24px" }}>
      <DestinationExplorer destinations={destinations} />
    </main>
  );
}
