/**
 * Vite Configuration for React Dashboard
 * Optimized for development and production builds
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // Server configuration for development
  server: {
    port: 3001,
    host: "0.0.0.0",
    open: false,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: ["cipher-zk57.onrender.com"],
  },

  // Build configuration
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          utils: ["axios", "zustand"],
        },
      },
    },
  },

  // Resolve aliases
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@contexts": path.resolve(__dirname, "./src/contexts"),
    },
  },

  // Environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
    __VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
  },
});
