import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
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
  }),
);
