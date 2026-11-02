import { handleMcp, json } from "@/lib/api-http";

export const POST = (request: Request) => handleMcp(request);
// MCP Streamable HTTP sin sesiones: no hay flujo SSE que abrir.
export const GET = () => json({ error: "Usa POST con JSON-RPC" }, 405, { Allow: "POST" });
