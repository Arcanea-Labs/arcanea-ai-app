import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const directory = join(process.cwd(), "app/gallery/living-art/_experience");

// Keep each traceable server file explicit. A URL segment never becomes a path.
const resources = new Map([
  [
    "tokens.css",
    {
      type: "text/css",
      read: () =>
        readFile(
          join(process.cwd(), "../../packages/design-system/src/tokens.css"),
          "utf8",
        ),
    },
  ],
  [
    "index.html",
    {
      type: "text/html",
      read: () => readFile(join(directory, "index.html"), "utf8"),
    },
  ],
  [
    "review.css",
    {
      type: "text/css",
      read: () => readFile(join(directory, "review.css"), "utf8"),
    },
  ],
  [
    "review.js",
    {
      type: "text/javascript",
      read: () => readFile(join(directory, "review.js"), "utf8"),
    },
  ],
  [
    "catalog.js",
    {
      type: "text/javascript",
      read: () => readFile(join(directory, "catalog.js"), "utf8"),
    },
  ],
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ resource?: string[] }> },
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  const target = process.env.VERCEL_ENV;
  const local = !target && process.env.NODE_ENV === "development";
  if (target !== "preview" && !local) {
    return new Response(null, { status: 404, headers });
  }

  const { resource = [] } = await context.params;
  const asset =
    resource.length <= 1 && resources.get(resource[0] ?? "index.html");
  if (!asset) return new Response(null, { status: 404, headers });

  headers.set("Content-Type", asset.type + "; charset=utf-8");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://www.arcanea.ai https://074zeen3w1vmjdo6.public.blob.vercel-storage.com",
      "media-src 'self' https://www.arcanea.ai",
      "font-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  return new Response(await asset.read(), { headers });
}
