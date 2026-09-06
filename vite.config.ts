import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["odin.tail17f7a4.ts.net"],
    proxy: {
      "/backend": {
        target: "http://127.0.0.1:3210",
        ws: true,
        rewrite: (path) => path.replace(/^\/backend/, ""),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: ["odin.tail17f7a4.ts.net"],
    proxy: {
      "/backend": {
        target: "http://127.0.0.1:3210",
        ws: true,
        rewrite: (path) => path.replace(/^\/backend/, ""),
      },
    },
  },
  css: { postcss: { plugins: [] } },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"], convex: ["convex/browser"] },
      },
    },
  },
});
