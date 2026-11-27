import assert from "node:assert/strict";
import test from "node:test";
import {
  DATADOG_RUM_INTAKE_SOURCES,
  DATADOG_RUM_SCRIPT_ORIGIN,
  DATADOG_RUM_SITE,
  allowsRumMeasurement,
  datadogRumConfig,
  datadogRumCspSources,
  isSensitiveRumPath,
  redactRumEvent,
  redactRumUrl,
  scrubCredentialPaths,
} from "../datadog-rum-config";

test("datadogRumConfig returns null until both required identifiers are configured", () => {
  assert.equal(datadogRumConfig({}), null);
  assert.equal(
    datadogRumConfig({ NEXT_PUBLIC_DD_RUM_APPLICATION_ID: "app-1" }),
    null,
  );
  assert.equal(
    datadogRumConfig({ NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN: "pub-1" }),
    null,
  );
});

test("datadogRumConfig returns privacy-hardened EU defaults and clamps sample rate", () => {
  const cfg = datadogRumConfig({
    NEXT_PUBLIC_DD_RUM_APPLICATION_ID: "app-123",
    NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN: "pub-456",
    NEXT_PUBLIC_DD_RUM_SAMPLE_RATE: "150",
    NEXT_PUBLIC_VERCEL_ENV: "preview",
  });
  assert.deepEqual(cfg, {
    applicationId: "app-123",
    clientToken: "pub-456",
    site: DATADOG_RUM_SITE,
    service: "arcanea-ai",
    env: "preview",
    sessionSampleRate: 100,
    sessionReplaySampleRate: 0,
    defaultPrivacyLevel: "mask",
    trackUserInteractions: false,
    trackResources: false,
  });
});

test("allowsRumMeasurement respects Do Not Track and Global Privacy Control", () => {
  assert.equal(allowsRumMeasurement(null, false), true);
  assert.equal(allowsRumMeasurement("1", false), false);
  assert.equal(allowsRumMeasurement(null, true), false);
});

test("redactRumEvent strips query/hash/referrer and redacts auth paths", () => {
  const view = {
    type: "view",
    view: {
      url: "https://www.arcanea.ai/chat?email=test@example.com#draft",
      referrer: "https://private.example/secret",
    },
    resource: { url: "https://www.arcanea.ai/api/chat?key=xyz" },
  };
  assert.equal(redactRumEvent(view), true);
  assert.equal(view.view.url, "https://www.arcanea.ai/chat");
  assert.equal(view.view.referrer, "");
  assert.equal(view.resource.url, "https://www.arcanea.ai/api/chat");

  assert.equal(isSensitiveRumPath("/auth/callback-secret"), true);
  assert.equal(
    redactRumUrl("https://www.arcanea.ai/auth/callback-secret?code=1"),
    "https://www.arcanea.ai/auth/:token",
  );
  assert.equal(
    scrubCredentialPaths("err at /onboarding/tok_1"),
    "err at /onboarding/:token",
  );
  assert.equal(
    redactRumEvent({
      type: "error",
      view: { url: "https://www.arcanea.ai/auth/callback-secret" },
    }),
    false,
  );
});

test("redactRumEvent drops exact auth/onboarding routes, percent-encoded paths, and query secrets in errors", () => {
  assert.equal(isSensitiveRumPath("/auth"), true);
  assert.equal(isSensitiveRumPath("/%61uth/callback"), true);
  assert.equal(isSensitiveRumPath("/chat"), false);

  const authError = {
    type: "error",
    view: { url: "https://www.arcanea.ai/auth?code=SECRET_OAUTH_CODE" },
    error: {
      message: "Auth failed at https://www.arcanea.ai/auth?code=SECRET_OAUTH_CODE",
    },
  };
  assert.equal(redactRumEvent(authError), false);

  const chatError = {
    type: "error",
    view: { url: "https://www.arcanea.ai/chat" },
    error: {
      message: "Redirected to https://www.arcanea.ai/auth/callback?code=SECRET_CODE",
      stack: "at run (https://www.arcanea.ai/api/chat?token=SECRET_TOK&page=1)",
    },
  };
  assert.equal(redactRumEvent(chatError), true);
  assert.equal(
    chatError.error.message,
    "Redirected to https://www.arcanea.ai/auth/:token",
  );
  assert.equal(
    chatError.error.stack,
    "at run (https://www.arcanea.ai/api/chat?token=:redacted&page=1)",
  );
});

test("datadogRumCspSources stays empty when disabled and returns EU script/intake origins when enabled", () => {
  assert.deepEqual(datadogRumCspSources({}), { scriptSrc: [], connectSrc: [] });
  assert.deepEqual(
    datadogRumCspSources({
      NEXT_PUBLIC_DD_RUM_APPLICATION_ID: "app-1",
      NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN: "pub-1",
    }),
    {
      scriptSrc: [DATADOG_RUM_SCRIPT_ORIGIN],
      connectSrc: DATADOG_RUM_INTAKE_SOURCES,
    },
  );
});
