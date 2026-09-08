import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST() {
  const connection = pool();

  await connection.query("truncate table destinations");

  const response = await fetch("http://localhost:3000/api/destinations");
  const body = await response.json();

  for (const destination of body.data) {
    await connection.query(
      "insert into destinations (name, country, region, cost_level, activities, average_daily_budget, annual_visitors) values (?, ?, ?, ?, ?, ?, ?)",
      [
        destination.name,
        destination.country,
        destination.region,
        destination.costLevel,
        JSON.stringify(destination.activities),
        destination.averageDailyBudget,
        destination.annualVisitors,
      ]
    );
  }

  return NextResponse.json({ seeded: body.data.length });
}
