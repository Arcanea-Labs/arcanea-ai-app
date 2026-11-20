import { handleRehearsal } from "@/lib/shop/genesis-preview/rehearsal.mjs";

import { GENESIS_STUDY_REVIEW } from "@/lib/shop/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handle(request: Request) {
  return handleRehearsal(
    request,
    process.env,
    process.cwd(),
    GENESIS_STUDY_REVIEW,
  );
}

export { handle as GET, handle as POST };
