import { operatorSnapshot } from "@/lib/shop/genesis-preview/operator-snapshot.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return operatorSnapshot(request, "releases");
}
