import { handleRest } from "@/lib/api-http";

type Ctx = { params: Promise<{ path?: string[] }> };

const run = async (request: Request, { params }: Ctx) => handleRest(request, (await params).path ?? []);

export const GET = run;
export const POST = run;
export const PUT = run;
