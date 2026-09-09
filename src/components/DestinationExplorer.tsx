"use client";

import { useState } from "react";

export type Destination = {
  name: string;
  country: string;
  region: string;
  cost_level: string;
  activities: string[];
  average_daily_budget: number;
  annual_visitors: number;
};

export default function DestinationExplorer({ destinations }: { destinations: Destination[] }) {
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>(destinations);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  function search() {
    if (searchTerm === "") {
      setFilteredDestinations(destinations);
      return;
    }

    setFilteredDestinations(
      destinations.filter(
        (destination) =>
          destination.name.includes(searchTerm) ||
          destination.country.includes(searchTerm) ||
          destination.region.includes(searchTerm) ||
          destination.cost_level.includes(searchTerm) ||
          JSON.stringify(destination.activities).includes(searchTerm) ||
          String(destination.average_daily_budget).includes(searchTerm),
      ),
    );
  }

  function resetSearch() {
    setSearchTerm("");
    setFilteredDestinations(destinations);
  }

  function sort(field: string) {
    let direction = "asc";

    if (sortField === field) {
      direction = sortDirection === "asc" ? "desc" : "asc";
    }

    setSortField(field);
    setSortDirection(direction);

    const sorted = [...filteredDestinations];
    sorted.sort((a, b) => {
      const left = a[field as keyof Destination];
      const right = b[field as keyof Destination];

      if (direction === "asc") {
        return left > right ? 1 : -1;
      }

      return left < right ? 1 : -1;
    });

    setFilteredDestinations(sorted);
  }

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Project Expedition Destinations</h1>
      <br />
      <br />
      <div>
        <p>Search</p>
        <p>
          Searching for: <span id="search-term">{searchTerm}</span>
        </p>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={() => search()}
          style={{ border: "1px solid black", padding: "4px" }}
        />
        <button onClick={() => resetSearch()}>Reset Search</button>
      </div>
      <br />
      <br />
      <div>
        <table>
          <thead>
            <tr>
              <th onClick={() => sort("name")} style={{ cursor: "pointer" }}>
                Name
              </th>
              <th onClick={() => sort("country")} style={{ cursor: "pointer" }}>
                Country
              </th>
              <th onClick={() => sort("region")} style={{ cursor: "pointer" }}>
                Region
              </th>
              <th onClick={() => sort("cost_level")} style={{ cursor: "pointer" }}>
                Cost Level
              </th>
              <th>Activities</th>
              <th onClick={() => sort("average_daily_budget")} style={{ cursor: "pointer" }}>
                Avg. Daily Budget
              </th>
              <th onClick={() => sort("annual_visitors")} style={{ cursor: "pointer" }}>
                Annual Visitors
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDestinations.map((destination, index) => (
              <tr key={index}>
                <td>{destination.name}</td>
                <td>{destination.country}</td>
                <td>{destination.region}</td>
                <td>{destination.cost_level}</td>
                <td>{destination.activities.join(", ")}</td>
                <td>{destination.average_daily_budget}</td>
                <td>{destination.annual_visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      `}</style>
    </div>
  );
}
