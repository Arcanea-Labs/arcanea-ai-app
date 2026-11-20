import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";

const scopes = {
  assets: [
    "ARCANEA_GENESIS_ASSET_REVIEW_HTML",
    "ARCANEA_GENESIS_ASSET_REVIEW_SHA256",
  ],
  releases: [
    "ARCANEA_GENESIS_RELEASE_REVIEW_HTML",
    "ARCANEA_GENESIS_RELEASE_REVIEW_SHA256",
  ],
};
const hash = (value) => createHash("sha256").update(value).digest();
const loopback = (host) =>
  /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host);

export async function operatorSnapshot(request, scope, env = process.env) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
  });
  const reply = (body, status) => new Response(body, { status, headers });
  const pass = env.ARCANEA_GENESIS_REVIEW_PASSWORD;
  const host = request.headers.get("host") || "";
  if (
    !Object.hasOwn(scopes, scope) ||
    env.ARCANEA_GENESIS_REHEARSAL !== "local" ||
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV ||
    env.VERCEL ||
    !loopback(host) ||
    !loopback(new URL(request.url).host) ||
    (request.headers.has("x-forwarded-host") &&
      !loopback(request.headers.get("x-forwarded-host"))) ||
    typeof pass !== "string" ||
    pass.length < 32
  )
    return reply("Not found", 404);

  const expected =
    "Basic " + Buffer.from("reviewer:" + pass).toString("base64");
  if (
    !timingSafeEqual(
      hash(request.headers.get("authorization") || ""),
      hash(expected),
    )
  ) {
    headers.set(
      "WWW-Authenticate",
      'Basic realm="Arcanea private review", charset="UTF-8"',
    );
    return reply("Reviewer credentials required", 401);
  }
  const [fileKey, hashKey] = scopes[scope];
  if (!env[fileKey] || !/^[0-9a-f]{64}$/.test(env[hashKey] || "")) {
    return reply("Review snapshot has not been configured", 503);
  }
  try {
    const bytes = await readFile(env[fileKey]);
    if (hash(bytes).toString("hex") !== env[hashKey])
      return reply("Review snapshot has changed", 503);
    headers.set("Content-Type", "text/html; charset=utf-8");
    return reply(bytes, 200);
  } catch {
    return reply("Review snapshot is unavailable", 503);
  }
}
