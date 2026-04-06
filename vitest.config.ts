import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "server/**/*.{test,spec}.{ts,js}"],
    environmentMatchGlobs: [
      ["server/**", "node"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines:      85,
        functions:  85,
        branches:   80,
        statements: 85,
      },
      include: ["src/**/*.{ts,tsx}", "server/**/*.{js,ts}"],
      exclude: [
        "src/test/setup.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "server/index.js",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
