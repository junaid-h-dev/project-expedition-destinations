import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-600">There is nothing at this address.</p>
      <Link
        href="/"
        className="mt-4 inline-block font-medium text-indigo-600 hover:text-indigo-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Back to the destinations
      </Link>
    </div>
  );
}
