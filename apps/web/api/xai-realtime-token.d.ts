import type { IncomingMessage, ServerResponse } from "node:http"

export default function handler(request: IncomingMessage, response: ServerResponse): Promise<void>
