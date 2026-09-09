import type { Metadata } from "next";
import { config } from "@/config";
import "./globals.css";

const appName = config().APP_NAME;

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: "Browse, search and compare the destinations Project Expedition offers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-50 text-gray-900">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
