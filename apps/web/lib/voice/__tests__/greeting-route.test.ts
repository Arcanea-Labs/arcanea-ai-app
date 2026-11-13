import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../../../app/api/voice/greeting/route";
import {
  PERSONAS,
  TENANT_GREETING_OVERRIDE,
} from "../../../app/room/[persona]/personas";

type UpstreamCall = { url: string; input: string; voice: string };

let address = 0;

/** Each request gets its own client address unless a test pins one. */
function request(query: Record<string, string>, ip?: string) {
  const url = new URL("https://www.arcanea.ai/api/voice/greeting");
  for (const [key, value] of Object.entries(query))
    url.searchParams.set(key, value);
  return GET(
    new NextRequest(url, {
      headers: {
        "x-forwarded-for":
          ip ?? `198.51.${(++address >> 8) & 255}.${address & 255}`,
      },
    }),
  );
}

const audio = () =>
  new Response(new Uint8Array([1, 2, 3]), {
    headers: { "Content-Type": "audio/mpeg" },
  });

function useUpstream(
  t: TestContext,
  respond: () => Promise<Response> = async () => audio(),
) {
  const calls: UpstreamCall[] = [];
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";
  t.after(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        input: string;
        voice: string;
      };
      calls.push({
        url: input instanceof Request ? input.url : String(input),
        input: body.input,
        voice: body.voice,
      });
      return respond();
    },
  );
  return calls;
}

/** Makes every cached greeting stale, whatever earlier tests warmed. */
function expireCache(t: TestContext) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() + 31 * 60 * 1000 });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("N distinct unknown tenants cause at most one upstream TTS call", async (t) => {
  const calls = useUpstream(t);
  const total = 40;
  for (let i = 0; i < total; i++) {
    const response = await request({
      persona: "lumina",
      tenant: `attacker-${i}-${"x".repeat(i)}`,
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tenant"), "arcanea");
    assert.equal(
      response.headers.get("x-greeting-cache"),
      i === 0 ? "miss" : "hit",
    );
    assert.equal((await response.arrayBuffer()).byteLength, 3);
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.openai.com/v1/audio/speech");
  assert.equal(calls[0].input, PERSONAS.lumina.greeting);

  // The default tenant itself and an omitted tenant reuse that same entry.
  const sameEntry: Record<string, string>[] = [
    { persona: "lumina", tenant: "arcanea" },
    {},
  ];
  for (const query of sameEntry) {
    const response = await request(query);
    assert.equal(response.headers.get("x-greeting-cache"), "hit");
  }
  assert.equal(calls.length, 1);
});

test("object prototype names are neither tenants nor personas", async (t) => {
  const calls = useUpstream(t);
  for (const tenant of [
    "constructor",
    "__proto__",
    "toString",
    "hasOwnProperty",
  ]) {
    const response = await request({ persona: "draconia", tenant });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tenant"), "arcanea");
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, PERSONAS.draconia.greeting);

  for (const persona of ["constructor", "__proto__", "toString", "unknown"]) {
    const response = await request({ persona });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Unknown persona" });
  }
  assert.equal(calls.length, 1);
});

test("known tenants keep their own greeting and the cache stays bounded", async (t) => {
  const calls = useUpstream(t);
  const personas = Object.keys(PERSONAS);
  const tenants = Object.keys(TENANT_GREETING_OVERRIDE);
  assert.deepEqual(tenants, ["arcanea", "sis", "frankx"]);

  const sis = await request({ persona: "alera", tenant: "sis" });
  assert.equal(sis.headers.get("x-tenant"), "sis");
  assert.equal(calls.at(-1)?.input, TENANT_GREETING_OVERRIDE.sis.alera);
  assert.equal(calls.at(-1)?.voice, "echo");

  // Warm every pair the config knows, then hammer with unknown tenants.
  for (const persona of personas)
    for (const tenant of tenants) await request({ persona, tenant });
  const warmed = calls.length;
  assert.ok(warmed <= personas.length * tenants.length);

  for (let i = 0; i < 60; i++) {
    const persona = personas[i % personas.length];
    const response = await request({ persona, tenant: `unknown-${i}` });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-greeting-cache"), "hit");
  }
  assert.equal(calls.length, warmed);
});

test("one client is rate limited before another greeting is generated", async (t) => {
  const calls = useUpstream(t);
  const ip = "203.0.113.77";
  for (let i = 0; i < 10; i++) {
    const response = await request({ persona: "nero" }, ip);
    assert.equal(response.status, 200);
  }
  const before = calls.length;
  const limited = await request({ persona: "nero", tenant: "fresh" }, ip);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(calls.length, before);

  const other = await request({ persona: "nero" }, "203.0.113.78");
  assert.equal(other.status, 200);
});

test("concurrent cold requests share one upstream TTS call", async (t) => {
  expireCache(t);
  const calls = useUpstream(t, async () => {
    await delay(25);
    return audio();
  });

  // N distinct unknown tenants from N addresses, all in flight together.
  const responses = await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      request({ persona: "shinkami", tenant: `burst-${i}` }),
    ),
  );
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tenant"), "arcanea");
    assert.equal((await response.arrayBuffer()).byteLength, 3);
  }
  assert.equal(calls.length, 1);

  // One address bursting: the limiter still applies, and the requests it
  // lets through share one call as well.
  const ip = "203.0.113.90";
  const burst = await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      request({ persona: "lyria", tenant: `burst-${i}` }, ip),
    ),
  );
  assert.equal(burst.filter((r) => r.status === 200).length, 10);
  assert.equal(burst.filter((r) => r.status === 429).length, 40);
  assert.equal(calls.length, 2);

  // Different cache keys do not wait on each other.
  await Promise.all([
    request({ persona: "alera", tenant: "sis" }),
    request({ persona: "alera", tenant: "frankx" }),
    request({ persona: "alera", tenant: "sis" }),
  ]);
  assert.equal(calls.length, 4);
});

test("a failed upstream call is shared, not cached, and does not block the next one", async (t) => {
  expireCache(t);
  t.mock.method(console, "error", () => {});
  let fail = true;
  const calls = useUpstream(t, async () => {
    await delay(25);
    if (fail) throw new Error("upstream unreachable");
    return audio();
  });

  const failed = await Promise.all(
    Array.from({ length: 5 }, () => request({ persona: "jarvis" })),
  );
  for (const response of failed) {
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "Greeting generation failed",
    });
  }
  assert.equal(calls.length, 1);

  fail = false;
  const retried = await request({ persona: "jarvis" });
  assert.equal(retried.status, 200);
  assert.equal(retried.headers.get("x-greeting-cache"), "miss");
  assert.equal(calls.length, 2);

  const cached = await request({ persona: "jarvis" });
  assert.equal(cached.headers.get("x-greeting-cache"), "hit");
  assert.equal(calls.length, 2);
});
