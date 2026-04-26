import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("remark-math") || id.includes("rehype-katex") || id.includes("/katex/")) {
            return "vendor-markdown-math";
          }
          if (id.includes("react-markdown") || id.includes("remark-gfm")) {
            return "vendor-markdown";
          }
          if (id.includes("react-syntax-highlighter") || id.includes("prism")) {
            return "vendor-code";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

          // Let Rollup decide for remaining dependencies to avoid circular chunk groups.
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
