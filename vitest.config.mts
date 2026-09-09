import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `new URL` rather than `import.meta.dirname`, which needs Node 20.11 while the
// rest of the project runs on the 20.9 that Next.js asks for.
const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  test: {
    // Server-side code (repositories, route handlers, auth) runs in Node against an
    // in-memory SQLite database; React components run in jsdom. JSX is compiled by
    // esbuild using the automatic runtime from tsconfig, so no React plugin is needed.
    projects: [
      {
        test: {
          name: "server",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          setupFiles: ["tests/setup/server.ts"],
        },
        resolve: { alias },
      },
      {
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["tests/**/*.test.tsx"],
          setupFiles: ["tests/setup/ui.ts"],
        },
        resolve: { alias },
      },
    ],
  },
});
