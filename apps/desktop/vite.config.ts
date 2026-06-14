import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: fileURLToPath(new URL("../web/public", import.meta.url)),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../web/src", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})
