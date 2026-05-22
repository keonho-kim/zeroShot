import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src")
    }
  },
  server: {
    port: 32576,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:32575",
        changeOrigin: false,
        timeout: 0,
        proxyTimeout: 0
      }
    }
  },
  build: {
    outDir: "dist"
  }
});
