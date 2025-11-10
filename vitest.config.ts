import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.spec.ts", "tests/**/*.spec.tsx"],
    css: false,
    // 👇 Use Node env for server-only tests
    environmentMatchGlobs: [
      ["tests/api/**", "node"],
      ["tests/middleware/**", "node"],
      ["tests/unit/**", "node"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),   // 👈 makes "@/lib/prisma" work in tests
    },
  },
  // ✅ Make JSX use the automatic runtime in tests
  esbuild: {
    jsx: "automatic",
    jsxDev: true,
  },
});
