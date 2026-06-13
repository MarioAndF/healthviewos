import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const devOnlyEnvPrefix = [
  "HEALTHVIEW_AGENT_MODEL",
  "HEALTHVIEW_AGENT_PROVIDER",
  "HEALTHVIEW_OPENAI_API_KEY",
  "HEALTHVIEW_OPENAI_MODEL",
  "HEALTHVIEW_XAI_API_KEY",
  "HEALTHVIEW_XAI_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "XAI_API_KEY",
  "XAI_MODEL",
]

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  envPrefix: command === "serve" ? ["VITE_", ...devOnlyEnvPrefix] : ["VITE_"],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}))
