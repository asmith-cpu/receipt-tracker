import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: `base` must match your repo name exactly, with slashes.
// If your repo is github.com/you/receipt-tracker, this is correct as-is.
// If you rename the repo, change this to "/new-repo-name/".
export default defineConfig({
  plugins: [react()],
  base: "/receipt-tracker/",
  server: { port: 5173 },
});
