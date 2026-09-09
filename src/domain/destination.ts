import type { CostLevel } from "./cost-level";

/** A destination as the application works with it (typed, timestamps as Dates). */
export interface Destination {
  id: number;
  name: string;
  country: string;
  region: string;
  costLevel: CostLevel;
  activities: string[];
  averageDailyBudget: number;
  annualVisitors: number;
  createdAt: Date;
  updatedAt: Date;
}

/** The attributes needed to create or update a destination. */
export interface DestinationAttributes {
  name: string;
  country: string;
  region: string;
  costLevel: CostLevel;
  activities: string[];
  averageDailyBudget: number;
  annualVisitors: number;
}
