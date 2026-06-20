import yaml from "@rollup/plugin-yaml";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The app imports YAML config (e.g. config/frontend.yaml); the plugin must be
  // registered for vitest too, otherwise rolldown tries to parse YAML as JS.
  plugins: [yaml()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.spec.ts", "src/**/*.spec.tsx", "src/test/**"],
    },
  },
});
