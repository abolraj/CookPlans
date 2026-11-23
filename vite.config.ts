import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,

  server: {
    host: '0.0.0.0',
    port: 1420,
    strictPort: true,
    watch: {
      // This tells Vite to ignore the entire Rust and Android source tree
      ignored: ['**/src-tauri/**'],
    },
  },
});
