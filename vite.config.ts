import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, proxy /api and /static to the Flask backend so the SPA and API share
// an origin (session cookies work without cross-site cookie config).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
      "/static": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
});
