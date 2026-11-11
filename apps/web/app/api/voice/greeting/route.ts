/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-function-type, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, react-hooks/rules-of-hooks, react-hooks/purity, react-hooks/refs, react-hooks/static-components, react-hooks/immutability, react-hooks/preserve-manual-memoization, jsx-a11y/alt-text, @next/next/no-img-element, @next/next/no-html-link-for-pages, react/no-unescaped-entities */
/**
 * Voice Greeting API Route
 *
 * Returns a streamed MP3 of the persona's activation greeting.
 * Used by daemon-launched windows: clap → window opens →
 * /api/voice/greeting?persona=X&tenant=Y plays automatically.
 *
 * Inputs (query):
 *  - persona: PersonaId (lumina, jarvis, draconia, lyria, alera, shinkami, nero)
 *  - tenant : 'arcanea' | 'sis' | 'frankx' (default 'arcanea'). Any other
 *    value is served as 'arcanea', so it can never create a new cache entry
 *    or a new paid TTS call.
 *
 * Caches greeting copy by (persona, tenant) for 30 minutes to avoid
 * re-billing OpenAI TTS on every clap. The cache lives in-memory per
 * Edge isolate — worst case duplicates one TTS call per cold start.
 * Requests that arrive while a greeting is being generated wait for that
 * one upstream call instead of starting their own.
 *
 * Cache strategy: store the audio bytes once, replay on subsequent calls.
 * Edge runtime ArrayBuffer is safe to reuse.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  PERSONAS,
  TENANT_GREETING_OVERRIDE,
  greetingFor,
  type PersonaId,
} from "@/app/room/[persona]/personas";
import {
  getClientIdentifier,
  checkRateLimit,
} from "@/lib/rate-limit/rate-limiter";

export const runtime = "edge";
export const maxDuration = 15;

interface CachedGreeting {
  bytes: ArrayBuffer;
  contentType: string;
  ts: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_TENANT = "arcanea";
const RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 };
// One entry per known (persona, tenant) pair; nothing else is ever cached.
const MAX_CACHE_ENTRIES =
  Object.keys(PERSONAS).length * Object.keys(TENANT_GREETING_OVERRIDE).length;
const cache = new Map<string, CachedGreeting>();
// One upstream call per cache key at a time. Bounded by the same known keys.
const pending = new Map<string, Promise<CachedGreeting | null>>();
// Below maxDuration, so a stalled upstream call cannot hold its waiters.
const UPSTREAM_TIMEOUT_MS = 12_000;

const TENANT_VOICE_OVERRIDE: Record<
  string,
  Partial<Record<PersonaId, string>>
> = {
  sis: {
    lumina: "shimmer",
    alera: "echo",
  },
  frankx: {
    lumina: "alloy",
    jarvis: "alloy",
  },
};

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(
    `voice:greeting:${getClientIdentifier(req)}`,
    RATE_LIMIT,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetTime - Date.now()) / 1000)),
        },
      },
    );
  }

  const url = new URL(req.url);
  const personaParam = url.searchParams.get("persona") || "lumina";
  const tenantParam = url.searchParams.get("tenant") || DEFAULT_TENANT;
  // Only tenants the greeting config knows; everything else is the default.
  const tenant = Object.hasOwn(TENANT_GREETING_OVERRIDE, tenantParam)
    ? tenantParam
    : DEFAULT_TENANT;

  // hasOwn, not `in`: "constructor" and friends are not personas.
  if (!Object.hasOwn(PERSONAS, personaParam)) {
    return NextResponse.json({ error: "Unknown persona" }, { status: 400 });
  }
  const personaId = personaParam as PersonaId;
  const persona = PERSONAS[personaId];
  const text = greetingFor(personaId, tenant);

  const cacheKey = `${personaId}|${tenant}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return new NextResponse(hit.bytes, {
      headers: {
        "Content-Type": hit.contentType,
        "Cache-Control": "public, max-age=1800",
        "X-Greeting-Cache": "hit",
        "X-Persona": personaId,
        "X-Tenant": tenant,
      },
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      { error: "TTS not configured. Set OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  const tenantVoice = TENANT_VOICE_OVERRIDE[tenant]?.[personaId];
  const voice =
    tenantVoice || (persona.voiceKey === "lumina" ? "nova" : "shimmer");

  let flight = pending.get(cacheKey);
  if (!flight) {
    flight = generateGreeting(openaiKey, text, voice)
      .then((greeting) => {
        if (!greeting) return null;
        if (!cache.has(cacheKey) && cache.size >= MAX_CACHE_ENTRIES) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        cache.set(cacheKey, greeting);
        return greeting;
      })
      .finally(() => pending.delete(cacheKey));
    pending.set(cacheKey, flight);
  }

  // Failures are not cached: the next request starts a new upstream call.
  const greeting = await flight;
  if (!greeting) {
    return NextResponse.json(
      { error: "Greeting generation failed" },
      { status: 502 },
    );
  }
  const { bytes, contentType } = greeting;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=1800",
      "X-Greeting-Cache": "miss",
      "X-Persona": personaId,
      "X-Tenant": tenant,
      "X-Voice": voice,
    },
  });
}

async function generateGreeting(
  openaiKey: string,
  text: string,
  voice: string,
): Promise<CachedGreeting | null> {
  try {
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: text,
        voice,
        response_format: "mp3",
        speed: 1.0,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("Greeting TTS error:", ttsRes.status, err);
      return null;
    }

    const bytes = await ttsRes.arrayBuffer();
    const contentType = ttsRes.headers.get("Content-Type") || "audio/mpeg";
    return { bytes, contentType, ts: Date.now() };
  } catch (err) {
    console.error("Greeting TTS error:", err);
    return null;
  }
}
