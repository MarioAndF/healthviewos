import { fileURLToPath, URL } from "node:url"
import type { IncomingMessage, ServerResponse } from "node:http"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import xaiRealtimeTokenHandler from "./api/xai-realtime-token.js"

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url))

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

type VercelLikeResponse = ServerResponse & {
  status: (statusCode: number) => VercelLikeResponse
  json: (body: unknown) => void
}

function createVercelLikeResponse(response: ServerResponse): VercelLikeResponse {
  const vercelLikeResponse = response as VercelLikeResponse

  vercelLikeResponse.status = (statusCode) => {
    response.statusCode = statusCode
    return vercelLikeResponse
  }

  vercelLikeResponse.json = (body) => {
    if (!response.headersSent) {
      response.setHeader("Content-Type", "application/json")
    }
    response.end(JSON.stringify(body))
  }

  return vercelLikeResponse
}

function healthViewLocalApiPlugin(): Plugin {
  return {
    name: "healthview-local-api",
    configureServer(server) {
      server.middlewares.use("/api/xai-realtime-token", async (request, response, next) => {
        try {
          await xaiRealtimeTokenHandler(request as IncomingMessage, createVercelLikeResponse(response))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

function loadLocalServerEnv(mode: string) {
  const env = loadEnv(mode, workspaceRoot, "")

  for (const [name, value] of Object.entries(env)) {
    process.env[name] ??= value
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === "serve") {
    loadLocalServerEnv(mode)
  }

  return {
    envDir: workspaceRoot,
    envPrefix: command === "serve" ? ["VITE_", ...devOnlyEnvPrefix] : ["VITE_"],
    plugins: [react(), tailwindcss(), healthViewLocalApiPlugin()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  }
})
