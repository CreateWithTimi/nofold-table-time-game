import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  esbuild: {
    drop: command === "build" ? ["console", "debugger"] : [],
  },
}));
