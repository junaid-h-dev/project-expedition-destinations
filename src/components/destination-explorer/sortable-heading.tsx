import Link from "next/link";
import { explorerHref, type ExplorerState } from "@/destinations/explorer-state";
import { type DestinationSort, SORT_LABELS, toggleDirection } from "@/domain/sorting";

interface Props {
  field: DestinationSort;
  state: ExplorerState;
  align?: "left" | "right";
}

/**
 * A sortable column heading. Plain links (no JavaScript required) that swap the
 * sort key or flip the direction, reset to page one, expose the active sort to
 * assistive tech via aria-sort, and show an indicator only on the active column.
 */
export function SortableHeading({ field, state, align = "left" }: Props) {
  const active = state.sort === field;
  const descending = active && state.direction === "desc";
  const href = explorerHref({
    ...state,
    sort: field,
    direction: active ? toggleDirection(state.direction) : "asc",
    page: 1,
  });

  return (
    <th
      scope="col"
      aria-sort={active ? (descending ? "descending" : "ascending") : "none"}
      className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}
    >
      <Link
        href={href}
        scroll={false}
        className="group inline-flex items-center gap-1 rounded text-xs font-semibold tracking-wide text-gray-600 uppercase hover:text-gray-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span>{SORT_LABELS[field]}</span>
        <span
          aria-hidden="true"
          className={active ? "text-indigo-600" : "text-gray-300 group-hover:text-gray-400"}
        >
          {descending ? "▾" : "▴"}
        </span>
      </Link>
    </th>
  );
}
