import react from "@vitejs/plugin-react";
import yaml from "@rollup/plugin-yaml";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), yaml()],
  server: {
    port: 5173,
  },
});
