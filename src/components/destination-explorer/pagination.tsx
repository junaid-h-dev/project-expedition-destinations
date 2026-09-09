import Link from "next/link";
import { explorerHref, type ExplorerState } from "@/destinations/explorer-state";
import type { Page } from "@/destinations/repository";

interface Props {
  page: Page<unknown>;
  state: ExplorerState;
}

const buttonClass =
  "inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500";
const disabledClass =
  "inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-400";

export function Pagination({ page, state }: Props) {
  if (page.lastPage <= 1) {
    return null;
  }

  const link = (number: number) => explorerHref({ ...state, page: number });

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-gray-200 px-4 py-3"
    >
      <p className="text-sm text-gray-600">
        Showing <span className="font-medium">{page.from}</span> to{" "}
        <span className="font-medium">{page.to}</span> of{" "}
        <span className="font-medium">{page.total}</span> results
      </p>
      <div className="flex items-center gap-2">
        {page.page > 1 ? (
          <Link href={link(page.page - 1)} scroll={false} className={buttonClass} rel="prev">
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Previous
          </span>
        )}
        <span className="text-sm text-gray-600">
          Page {page.page} of {page.lastPage}
        </span>
        {page.page < page.lastPage ? (
          <Link href={link(page.page + 1)} scroll={false} className={buttonClass} rel="next">
            Next
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
