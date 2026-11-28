import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { POST, swarmRouteDeps } from "../../../app/api/chat/swarm/route";

function request(body: unknown = { input: "Design a villain for my world." }) {
  return POST(
    new NextRequest("https://www.arcanea.ai/api/chat/swarm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.9",
      },
      body: JSON.stringify(body),
    }),
  );
}

/** Stub the session lookup and record every outbound request. */
function useSession(
  t: TestContext,
  session: { userId: string | null } | "throws",
  anthropicKey: string | null,
) {
  const upstream: string[] = [];
  const original = swarmRouteDeps.createClient;
  const previousKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey === null) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = anthropicKey;
  swarmRouteDeps.createClient = (async () => {
    if (session === "throws") throw new Error("no request scope");
    return {
      auth: {
        getUser: async () => ({
          data: { user: session.userId ? { id: session.userId } : null },
        }),
      },
    };
  }) as never;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    upstream.push(input instanceof Request ? input.url : String(input));
    return Response.json({ error: "blocked in tests" }, { status: 400 });
  });
  t.after(() => {
    swarmRouteDeps.createClient = original;
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousKey;
  });
  return upstream;
}

test("swarm refuses a request without a session before any model call", async (t) => {
  const upstream = useSession(t, { userId: null }, "test-platform-key");
  for (const body of [
    undefined,
    { input: "Spend the platform key.", force: true, maxLuminors: 5 },
    "not an object",
  ]) {
    const response = await request(body);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.deepEqual(await response.json(), {
      error: "Sign in to use the swarm.",
    });
  }
  assert.deepEqual(upstream, []);
});

test("swarm fails closed when the session cannot be resolved", async (t) => {
  const upstream = useSession(t, "throws", "test-platform-key");
  const response = await request();
  assert.equal(response.status, 401);
  assert.deepEqual(upstream, []);
});

test("a signed-in request passes the session gate", async (t) => {
  // No platform key configured: the first response after the gate is the 503.
  const upstream = useSession(t, { userId: "user-gate" }, null);
  const response = await request();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "ANTHROPIC_API_KEY not configured",
  });
  assert.deepEqual(upstream, []);
});

test("swarm is rate limited per signed-in user", async (t) => {
  const upstream = useSession(t, { userId: "user-limited" }, null);
  for (let i = 0; i < 5; i++) assert.equal((await request()).status, 503);
  const limited = await request();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.deepEqual(await limited.json(), {
    error: "Rate limit exceeded. Try again in a minute.",
  });

  // Same address, different account: the limit is keyed on the user.
  swarmRouteDeps.createClient = (async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-other" } } }) },
  })) as never;
  assert.equal((await request()).status, 503);
  assert.deepEqual(upstream, []);
});

test("a signed-in request with a platform key reaches the model stream", async (t) => {
  const upstream = useSession(
    t,
    { userId: "user-stream" },
    "test-platform-key",
  );
  // The stubbed upstream answers 400; keep the SDK's error log out of the run.
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "error", () => {});
  const response = await request({
    input: "Design a villain for my world.",
    heuristicOnly: true,
    maxLuminors: 1,
  });
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/event-stream/,
  );
  const events = await response.text();
  assert.match(events, /"type":"plan"/);
  assert.match(events, /"type":"done"/);
  assert.ok(upstream.length > 0);
  assert.ok(
    upstream.every((url) => url.startsWith("https://api.anthropic.com/")),
  );
});
