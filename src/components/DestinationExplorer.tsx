"use client";

import { useState } from "react";

type Destination = {
  name: string;
  country: string;
  region: string;
  cost_level: string;
  activities: string[];
  average_daily_budget: number;
  annual_visitors: number;
};

const HARDCODED_DESTINATIONS: Destination[] = [
  {
    name: "Machu Picchu",
    country: "Peru",
    region: "South America",
    cost_level: "Moderate",
    activities: ["Hiking & Trekking", "Cultural Tours", "Photography", "Historical Sightseeing"],
    average_daily_budget: 150,
    annual_visitors: 1500000,
  },
  {
    name: "Santorini",
    country: "Greece",
    region: "Europe",
    cost_level: "Premium",
    activities: ["Beach & Relaxation", "Food & Wine Tasting", "Photography", "Sailing & Boating"],
    average_daily_budget: 250,
    annual_visitors: 2000000,
  },
  {
    name: "Kyoto",
    country: "Japan",
    region: "Asia",
    cost_level: "Moderate",
    activities: ["Cultural Tours", "Historical Sightseeing", "Food & Wine Tasting", "Photography"],
    average_daily_budget: 180,
    annual_visitors: 5300000,
  },
  {
    name: "Serengeti National Park",
    country: "Tanzania",
    region: "Africa",
    cost_level: "Premium",
    activities: ["Wildlife Safari", "Photography", "Hot Air Ballooning", "Camping"],
    average_daily_budget: 300,
    annual_visitors: 350000,
  },
  {
    name: "Queenstown",
    country: "New Zealand",
    region: "Oceania",
    cost_level: "Premium",
    activities: ["Adventure Sports", "Skiing & Snowboarding", "Hiking & Trekking", "Paragliding"],
    average_daily_budget: 200,
    annual_visitors: 3000000,
  },
  {
    name: "Reykjavik",
    country: "Iceland",
    region: "Europe",
    cost_level: "Premium",
    activities: ["Hiking & Trekking", "Hot Air Ballooning", "Photography", "Volcano Tours"],
    average_daily_budget: 280,
    annual_visitors: 2300000,
  },
  {
    name: "Cusco",
    country: "Peru",
    region: "South America",
    cost_level: "Budget",
    activities: ["Hiking & Trekking", "Cultural Tours", "Historical Sightseeing", "Food & Wine Tasting"],
    average_daily_budget: 60,
    annual_visitors: 2700000,
  },
  {
    name: "Bali",
    country: "Indonesia",
    region: "Asia",
    cost_level: "Budget",
    activities: ["Beach & Relaxation", "Surfing", "Yoga & Wellness Retreats", "Cultural Tours"],
    average_daily_budget: 70,
    annual_visitors: 6200000,
  },
  {
    name: "Banff National Park",
    country: "Canada",
    region: "North America",
    cost_level: "Moderate",
    activities: ["Hiking & Trekking", "Skiing & Snowboarding", "Kayaking & Canoeing", "Wildlife Safari"],
    average_daily_budget: 180,
    annual_visitors: 4000000,
  },
  {
    name: "Patagonia",
    country: "Argentina",
    region: "South America",
    cost_level: "Premium",
    activities: ["Hiking & Trekking", "Rock Climbing", "Photography", "Camping"],
    average_daily_budget: 220,
    annual_visitors: 400000,
  },
  {
    name: "Marrakech",
    country: "Morocco",
    region: "Africa",
    cost_level: "Budget",
    activities: ["Cultural Tours", "Food & Wine Tasting", "Historical Sightseeing", "Nightlife & Entertainment"],
    average_daily_budget: 55,
    annual_visitors: 3000000,
  },
  {
    name: "Dubrovnik",
    country: "Croatia",
    region: "Europe",
    cost_level: "Moderate",
    activities: ["Historical Sightseeing", "Beach & Relaxation", "Kayaking & Canoeing", "Food & Wine Tasting"],
    average_daily_budget: 160,
    annual_visitors: 1400000,
  },
  {
    name: "Cancun",
    country: "Mexico",
    region: "North America",
    cost_level: "Moderate",
    activities: ["Beach & Relaxation", "Scuba Diving & Snorkeling", "Nightlife & Entertainment", "Cultural Tours"],
    average_daily_budget: 140,
    annual_visitors: 8000000,
  },
  {
    name: "Phuket",
    country: "Thailand",
    region: "Asia",
    cost_level: "Budget",
    activities: ["Beach & Relaxation", "Scuba Diving & Snorkeling", "Food & Wine Tasting", "Nightlife & Entertainment"],
    average_daily_budget: 80,
    annual_visitors: 9500000,
  },
  {
    name: "Swiss Alps",
    country: "Switzerland",
    region: "Europe",
    cost_level: "Luxury",
    activities: ["Skiing & Snowboarding", "Hiking & Trekking", "Rock Climbing", "Photography"],
    average_daily_budget: 400,
    annual_visitors: 1200000,
  },
];

export default function DestinationExplorer() {
  // Uncomment this to load the destinations from the database
  // useEffect(() => {
  //   fetch("/api/destinations")
  //     .then((response) => response.json())
  //     .then((body) => {
  //       setDestinations(body.data);
  //       setFilteredDestinations(body.data);
  //     });
  // }, []);
  const [destinations] = useState<Destination[]>(HARDCODED_DESTINATIONS);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>(HARDCODED_DESTINATIONS);
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
          String(destination.average_daily_budget).includes(searchTerm)
      )
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
              <th onClick={() => sort("name")} style={{ cursor: "pointer" }}>Name</th>
              <th onClick={() => sort("country")} style={{ cursor: "pointer" }}>Country</th>
              <th onClick={() => sort("region")} style={{ cursor: "pointer" }}>Region</th>
              <th onClick={() => sort("cost_level")} style={{ cursor: "pointer" }}>Cost Level</th>
              <th>Activities</th>
              <th onClick={() => sort("average_daily_budget")} style={{ cursor: "pointer" }}>Avg. Daily Budget</th>
              <th onClick={() => sort("annual_visitors")} style={{ cursor: "pointer" }}>Annual Visitors</th>
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
