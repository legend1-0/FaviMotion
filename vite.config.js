import { defineConfig } from "vite";

export default defineConfig({
  root: "demo",
  resolve: {
    alias: {
      "favicon-motion": new URL("./src/index.js", import.meta.url).pathname,
    },
  },
  server: {
    open: true,
  },
});
