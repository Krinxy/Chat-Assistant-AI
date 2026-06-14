import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import yaml from "vite-plugin-yaml";

export default defineConfig({
  plugins: [react(), yaml()],
  server: {
    port: 5173,
  },
});
