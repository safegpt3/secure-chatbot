import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext', // Ensure the target is set to a version that supports top-level await
    minify: false, // Disabling minification might help in avoiding some ESBuild issues
    esbuild: {
      target: 'esnext', // Set esbuild target explicitly
      supported: {
        'top-level-await': true,  // Ensure top-level await is supported
      },
    },
  },
  optimizeDeps: {
    exclude: ['scribe.js-ocr'], // Exclude the problematic dependency
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.js",
  },
});
