import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import plates from "@/lib/genesis/published-plates.json";
import {
  museumPlate,
  localPlateCopiesEnabled,
} from "@/lib/genesis/plate-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ plate: string }> },
) {
  const root = process.env.ARCANEA_GENESIS_PREVIEW_MEDIA_DIR;
  if (
    !localPlateCopiesEnabled() ||
    !root ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  ) {
    return new Response(null, { status: 404, headers });
  }
  const { plate } = await context.params;
  const museum = plate === museumPlate.slug;
  const item = museum ? museumPlate : plates.find((p) => p.slug === plate);
  if (!item) return new Response(null, { status: 404, headers });
  // Names come from the published plate projection. Unlisted files are unreachable.
  const filename = museum
    ? "1986.2.1_web.jpg"
    : "published-" + item.slug + ".webp";
  try {
    const bytes = await readFile(join(root, filename));
    if (createHash("sha256").update(bytes).digest("hex") !== item.sha256)
      throw new Error("Rendition mismatch");
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": museum ? "image/jpeg" : "image/webp",
      },
    });
  } catch {
    return new Response("Reviewed rendition unavailable.", {
      status: 503,
      headers,
    });
  }
}
