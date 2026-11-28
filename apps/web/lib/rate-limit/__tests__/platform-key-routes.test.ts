import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { POST as arenaRun } from "../../../app/api/arena/run/route";
import { POST as swarmInvoke } from "../../../app/api/swarm/invoke/route";
import { POST as encounter } from "../../../app/api/living-lore/encounter/route";
import { POST as forgeLuminor } from "../../../app/api/forge/luminor/route";
import { POST as worldImage } from "../../../app/api/worlds/generate-image/route";

// Each body is rejected by the route's own validation with a 400, so the
// requests below never reach a model provider.
const routes = [
  { path: "/api/arena/run", handler: arenaRun, limit: 5, body: "not json" },
  { path: "/api/swarm/invoke", handler: swarmInvoke, limit: 5, body: "{}" },
  {
    path: "/api/living-lore/encounter",
    handler: encounter,
    limit: 20,
    body: "{}",
  },
  {
    path: "/api/forge/luminor",
    handler: forgeLuminor,
    limit: 10,
    body: JSON.stringify({ description: "short" }),
  },
  {
    path: "/api/worlds/generate-image",
    handler: worldImage,
    limit: 5,
    body: "{}",
  },
] as const;

function send(route: (typeof routes)[number], ip: string) {
  return route.handler(
    new NextRequest(`https://www.arcanea.ai${route.path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: route.body,
    }),
  );
}

for (const [index, route] of routes.entries()) {
  test(`${route.path} limits one client and leaves others alone`, async (t) => {
    let upstream = 0;
    t.mock.method(globalThis, "fetch", async () => {
      upstream++;
      throw new Error("Network access is forbidden in this test");
    });
    const ip = `203.0.113.${index + 1}`;
    for (let i = 0; i < route.limit; i++)
      assert.equal((await send(route, ip)).status, 400);

    const limited = await send(route, ip);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    assert.deepEqual(await limited.json(), {
      error: "Rate limit exceeded. Try again in a minute.",
    });

    assert.equal((await send(route, `198.51.100.${index + 1}`)).status, 400);
    assert.equal(upstream, 0);
  });
}

test("one route's limit does not consume another route's budget", async () => {
  // Same client that exhausted /api/arena/run above.
  const response = await send(routes[1], "203.0.113.1");
  assert.equal(response.status, 400);
});
