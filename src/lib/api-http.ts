import "server-only";
import { ApiError } from "./api-core";
import { authenticate, type ApiPrincipal } from "./api-tokens";
import { TOOLS, runTool } from "./api-tools";

const MAX_BODY = 200_000;

export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });

export function baseUrlOf(request: Request) {
  return (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
}

export function errorResponse(e: unknown) {
  if (e instanceof ApiError) return json({ error: e.message }, e.status);
  console.error(e);
  return json({ error: "Error interno" }, 500);
}

export const unauthorized = () =>
  json({ error: "Falta o no es válido el token. Envía Authorization: Bearer gp_…" }, 401, { "WWW-Authenticate": 'Bearer realm="gym-planner"' });

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new ApiError(413, "Cuerpo demasiado grande");
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "JSON no válido");
  }
}

export async function requirePrincipal(request: Request): Promise<ApiPrincipal | null> {
  return authenticate(request);
}

/* ───────────── REST ───────────── */

type Route = { method: "GET" | "POST" | "PUT"; path: string; tool: string; summary: string };

/** `:id` captura un segmento y se pasa como argumento `id`. */
export const ROUTES: Route[] = [
  { method: "GET", path: "today", tool: "get_today", summary: "Qué toca hoy y enlace a la rutina del día" },
  { method: "GET", path: "calendar", tool: "get_calendar", summary: "Plan y lo hecho de un rango de días" },
  { method: "GET", path: "plan", tool: "get_plan", summary: "Plan semanal activo" },
  { method: "PUT", path: "plan", tool: "set_plan", summary: "Crear o actualizar el plan semanal" },
  { method: "PUT", path: "plan/day", tool: "set_plan_day", summary: "Definir qué toca un día del plan" },
  { method: "GET", path: "analytics", tool: "get_analytics", summary: "Análisis de entrenamiento" },
  { method: "GET", path: "meta", tool: "get_meta", summary: "Valores válidos de músculo y material" },
  { method: "GET", path: "exercises", tool: "search_exercises", summary: "Buscar ejercicios" },
  { method: "POST", path: "exercises", tool: "create_exercise", summary: "Crear un ejercicio propio" },
  { method: "GET", path: "exercises/:id", tool: "get_exercise", summary: "Detalle de un ejercicio" },
  { method: "GET", path: "routines", tool: "list_routines", summary: "Listar rutinas" },
  { method: "POST", path: "routines", tool: "create_routine", summary: "Crear una rutina" },
  { method: "GET", path: "routines/:id", tool: "get_routine", summary: "Ver una rutina" },
  { method: "PUT", path: "routines/:id", tool: "update_routine", summary: "Modificar una rutina" },
];

function match(method: string, segments: string[]) {
  for (const r of ROUTES) {
    if (r.method !== method) continue;
    const parts = r.path.split("/");
    if (parts.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    parts.forEach((p, i) => {
      if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(segments[i]);
      else if (p !== segments[i]) ok = false;
    });
    if (ok) return { route: r, params };
  }
  return null;
}

export async function handleRest(request: Request, segments: string[]) {
  try {
    if (segments.length === 0) return json({ name: "Gym Planner API", version: 1, openapi: `${baseUrlOf(request)}/api/v1/openapi.json`, mcp: `${baseUrlOf(request)}/api/mcp` });
    if (segments.length === 1 && segments[0] === "openapi.json" && request.method === "GET") return json(openApiSpec(baseUrlOf(request)));

    const m = match(request.method, segments);
    if (!m) {
      const other = ["GET", "POST", "PUT"].some((x) => match(x, segments));
      return json({ error: other ? "Método no permitido" : "Ruta no encontrada" }, other ? 405 : 404);
    }
    const principal = await requirePrincipal(request);
    if (!principal) return unauthorized();

    let args: Record<string, unknown>;
    if (request.method === "GET") args = Object.fromEntries(new URL(request.url).searchParams);
    else {
      const body = await readJson(request);
      if (typeof body !== "object" || body === null || Array.isArray(body)) throw new ApiError(400, "El cuerpo debe ser un objeto JSON");
      args = body as Record<string, unknown>;
    }
    Object.assign(args, m.params);
    const result = await runTool(m.route.tool, args, { principal, baseUrl: baseUrlOf(request) });
    return json(result, request.method === "POST" ? 201 : 200);
  } catch (e) {
    return errorResponse(e);
  }
}

function openApiSpec(baseUrl: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of ROUTES) {
    const tool = TOOLS.find((t) => t.name === r.tool)!;
    const schema = tool.inputSchema as { properties?: Record<string, unknown>; required?: string[] };
    const props = schema.properties ?? {};
    const pathParams = [...r.path.matchAll(/:(\w+)/g)].map((x) => x[1]);
    const parameters: unknown[] = pathParams.map((name) => ({ name, in: "path", required: true, schema: props[name] ?? { type: "string" } }));
    const op: Record<string, unknown> = {
      operationId: tool.name,
      summary: r.summary,
      description: tool.description,
      security: [{ bearer: [] }],
      responses: { "200": { description: "OK" }, "401": { description: "Token no válido" }, "403": { description: "Token de solo lectura" } },
    };
    if (r.method === "GET") {
      for (const [name, s] of Object.entries(props)) if (!pathParams.includes(name)) parameters.push({ name, in: "query", schema: s });
    } else {
      op.requestBody = {
        required: true,
        content: { "application/json": { schema: { type: "object", properties: Object.fromEntries(Object.entries(props).filter(([k]) => !pathParams.includes(k))), required: (schema.required ?? []).filter((k) => !pathParams.includes(k)) } } },
      };
    }
    op.parameters = parameters;
    const key = "/api/v1/" + r.path.replace(/:(\w+)/g, "{$1}");
    (paths[key] ??= {})[r.method.toLowerCase()] = op;
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Gym Planner API",
      version: "1.0.0",
      description: "API personal para que una IA consulte qué toca hoy, analice el entreno y cree rutinas y ejercicios. Autenticación con token personal (Perfil → Acceso para IAs).",
    },
    servers: [{ url: baseUrl }],
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "Token gp_… generado en la app" } } },
    paths,
  };
}

/* ───────────── MCP (Streamable HTTP, sin estado) ───────────── */

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

async function rpc(msg: Rpc, principal: ApiPrincipal, baseUrl: string) {
  const id = msg.id ?? null;
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });
  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion ?? "");
      return ok({
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: {} },
        serverInfo: { name: "gym-planner", version: "1.0.0" },
        instructions:
          "Gym Planner: consulta qué toca hoy (get_today devuelve un `link` para pasar al usuario), analiza su entreno (get_analytics) y crea rutinas y ejercicios. Busca siempre el ejercicio con search_exercises antes de crear uno nuevo.",
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({
        tools: TOOLS.filter((t) => !t.write || principal.scope === "edit").map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (typeof msg.params?.arguments === "object" && msg.params.arguments !== null ? msg.params.arguments : {}) as Record<string, unknown>;
      try {
        const result = await runTool(name, args, { principal, baseUrl });
        return ok({ content: [{ type: "text", text: JSON.stringify(result) }] });
      } catch (e) {
        const text = e instanceof ApiError ? e.message : "Error interno";
        if (!(e instanceof ApiError)) console.error(e);
        return ok({ content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      return fail(-32601, `Método no soportado: ${msg.method}`);
  }
}

export async function handleMcp(request: Request) {
  try {
    const principal = await requirePrincipal(request);
    if (!principal) return unauthorized();
    const body = await readJson(request);
    const baseUrl = baseUrlOf(request);
    const batch = Array.isArray(body);
    const msgs = (batch ? body : [body]) as Rpc[];
    const out: unknown[] = [];
    for (const m of msgs) {
      if (m.id === undefined || m.id === null) continue; // notificaciones: sin respuesta
      out.push(await rpc(m, principal, baseUrl));
    }
    if (out.length === 0) return new Response(null, { status: 202 });
    return json(batch ? out : out[0]);
  } catch (e) {
    return errorResponse(e);
  }
}
