import type { CostLevel } from "@/domain/cost-level";

const STYLES: Record<CostLevel, string> = {
  Budget: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Moderate: "bg-sky-50 text-sky-700 ring-sky-600/20",
  Premium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Luxury: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

export function CostLevelBadge({ level }: { level: CostLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[level]}`}
    >
      {level}
    </span>
  );
}
