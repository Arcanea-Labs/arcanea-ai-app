import { handleRehearsal } from "@/lib/shop/genesis-preview/rehearsal.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (request: Request) => handleRehearsal(request);
export const POST = (request: Request) => handleRehearsal(request);
