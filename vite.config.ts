import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
<<<<<<< HEAD
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/di-rio-do-motorista/" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
=======

export default defineConfig({
  plugins: [react()],
>>>>>>> 74846f0b1cc1d1abce17e573816f3259ddfaecfc
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
<<<<<<< HEAD
}));
=======
});
>>>>>>> 74846f0b1cc1d1abce17e573816f3259ddfaecfc
