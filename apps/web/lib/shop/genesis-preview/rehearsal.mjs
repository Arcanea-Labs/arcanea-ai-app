import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const PREFIX = "/api/genesis/preview/";
const SESSION_SECONDS = 60 * 60 * 4;
const SAMPLE_SHA =
  "bb5e701204961c6b624c2e541a7ef861b0b7f29a864e8d769323ae4373150809";
const MODE = "local-rehearsal";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const hash = (data) => createHash("sha256").update(data).digest("hex");
const json = (body, status = 200, extra = {}) =>
  Response.json(body, { status, headers: { ...headers, ...extra } });
const error = (message, status) => json({ error: message }, status);
const escrowError = () =>
  error("The review file or its permission record could not be verified.", 503);

export function rehearsalEnabled(environment, url) {
  return (
    environment.ARCANEA_GENESIS_REHEARSAL === "local" &&
    environment.NODE_ENV !== "production" &&
    !environment.VERCEL &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)
  );
}

function checkedFile(path, expected) {
  if (!path || !/^[a-f0-9]{64}$/.test(expected || ""))
    throw Error("Missing file pin");
  const bytes = readFileSync(path);
  if (hash(bytes) !== expected) throw Error("File pin mismatch");
  return bytes;
}

// Accepted files come only from operator configuration. Request data never selects a path.
export function loadRehearsalOffer(environment, appRoot) {
  const privateConfig = [
    environment.ARCANEA_GENESIS_PREVIEW_ZIP,
    environment.ARCANEA_GENESIS_PREVIEW_SHA256,
    environment.ARCANEA_GENESIS_PREVIEW_LICENSE,
    environment.ARCANEA_GENESIS_PREVIEW_LICENSE_SHA256,
  ];
  if (privateConfig.some(Boolean)) {
    const [file, sha256, licenseFile, licenseSha256] = privateConfig;
    const bytes = checkedFile(file, sha256);
    const licenseBytes = checkedFile(licenseFile, licenseSha256);
    return {
      bytes,
      licenseBytes,
      sku: "GENESIS-STUDY-01",
      title: "The Phoenix Screen",
      description:
        "An illustrated study of a Japanese folding screen from the Cleveland Museum of Art. Includes the complete screen and two detail crops as three image files, with the study in PDF and HTML.",
      filename: "genesis-the-phoenix-screen.zip",
      type: "application/zip",
      sha256,
      licenseSha256,
      license:
        "Source artwork is available under CC0. The enclosed permission record identifies the terms for each part of this review copy.",
    };
  }
  const bytes = checkedFile(
    join(appRoot, "public/downloads/arcanea-world-starter.md"),
    SAMPLE_SHA,
  );
  const note = bytes.toString("utf8").split("## Use permission")[1]?.trim();
  if (!note) throw Error("Sample permission missing");
  const licenseBytes = Buffer.from(note + "\n");
  return {
    bytes,
    licenseBytes,
    sku: "ARC-FREE-WORLD-STARTER",
    title: "World Starter · free rehearsal sample",
    description:
      "The existing editable World Starter text and its original permission. This practice delivery contains no paid art edition.",
    filename: "arcanea-world-starter.md",
    type: "text/markdown; charset=utf-8",
    sha256: SAMPLE_SHA,
    licenseSha256: hash(licenseBytes),
    license:
      "The sample permits original personal and commercial adaptations under its enclosed permission.",
  };
}

function publicOffer(offer) {
  return {
    sku: offer.sku,
    title: offer.title,
    description: offer.description,
    filename: offer.filename,
    license: offer.license,
    sha256: offer.sha256,
    licenseSha256: offer.licenseSha256,
    byteLength: offer.bytes.length,
    termsUrl: PREFIX + "terms?sha256=" + offer.licenseSha256,
    replacementUrl: null,
  };
}

async function readCheckout(request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return error("Send JSON.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) return error("Checkout details are missing.", 400);
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 2048) {
        await reader.cancel();
        return error("Request is too large.", 413);
      }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const confirmations = [
      "acceptLicense",
      "immediateDelivery",
      "acknowledgeWithdrawal",
    ];
    const fields = ["edition", "fileSha256", "licenseSha256", ...confirmations];
    if (
      !body ||
      Object.keys(body).some((k) => !fields.includes(k)) ||
      body.edition !== "genesis-digital"
    ) {
      return error("Unknown edition or checkout field.", 400);
    }
    if (![body.fileSha256, body.licenseSha256].every(
      (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value),
    )) return error("Open the edition and review its current license.", 422);
    if (confirmations.some((key) => body[key] !== true)) {
      return error("Confirm each permission before rehearsing delivery.", 422);
    }
    return body;
  } catch {
    return error("Invalid checkout details.", 400);
  } finally {
    reader.releaseLock();
  }
}

export function openRehearsal({ dbPath, offer, now = Date.now }) {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders(
      id TEXT PRIMARY KEY, sid TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      sku TEXT, title TEXT NOT NULL, file_hash TEXT NOT NULL, terms_hash TEXT NOT NULL,
      created INTEGER NOT NULL, canceled INTEGER, UNIQUE(sid, file_hash, terms_hash)
    );
    CREATE TABLE IF NOT EXISTS requests(
      sid TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, key TEXT NOT NULL,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, PRIMARY KEY(sid,key)
    );
    CREATE TABLE IF NOT EXISTS events(
      sid TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name TEXT NOT NULL, at INTEGER NOT NULL, order_id TEXT
    );
  `);
  // Rehearsal state is temporary. Preserve any receipts from an earlier local build.
  if (
    !db
      .prepare("PRAGMA table_info(orders)")
      .all()
      .some((column) => column.name === "sku")
  ) {
    db.exec("ALTER TABLE orders ADD COLUMN sku TEXT");
  }
  const event = (sid, name, time, orderId = null) =>
    db
      .prepare("INSERT INTO events(sid,name,at,order_id) VALUES(?,?,?,?)")
      .run(sid, name, time, orderId);
  const libraryItem = (row) => ({
    orderId: row.id,
    sku: row.sku,
    title: row.title,
    sha256: row.file_hash,
    status: row.canceled === null ? "available" : "canceled",
    downloadUrl: PREFIX + "download/" + row.id,
    licenseUrl: PREFIX + "license/" + row.id,
    receiptUrl: PREFIX + "receipt/" + row.id,
    cancelUrl: PREFIX + "cancel/" + row.id,
  });

  async function handle(request) {
    const url = new URL(request.url);
    const parts = url.pathname.startsWith(PREFIX)
      ? url.pathname.slice(PREFIX.length).split("/")
      : [];
    const [action, id] = parts;
    const isRead = [
      "library",
      "terms",
      "download",
      "license",
      "receipt",
    ].includes(action);
    const isWrite = ["checkout", "cancel"].includes(action);
    if (
      !(isRead || isWrite) ||
      parts.length !==
        (["download", "license", "receipt", "cancel"].includes(action) ? 2 : 1)
    ) {
      return error("Unknown review route.", 404);
    }
    if (request.method !== (isRead ? "GET" : "POST"))
      return error("Method not permitted.", 405);
    if (isWrite && request.headers.get("origin") !== url.origin)
      return error("Request origin is not permitted.", 403);

    let product;
    if (action !== "receipt" && action !== "cancel") {
      try {
        product = offer();
      } catch {
        return escrowError();
      }
    }
    if (action === "terms") {
      const expected = url.searchParams.get("sha256");
      if (expected && expected !== product.licenseSha256)
        return error("The license changed. Reopen the edition to read the current terms.", 409);
      return new Response(product.licenseBytes, {
        headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const time = now();
    db.prepare("DELETE FROM sessions WHERE expires <= ?").run(time);
    const raw = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)arc_genesis_review=([a-f0-9]{64})(?:;|$)/)?.[1];
    let sid = raw && hash(raw);
    const session =
      sid && db.prepare("SELECT id FROM sessions WHERE id=?").get(sid);
    if (action === "library") {
      let cookie = {};
      if (!session) {
        const token = randomBytes(32).toString("hex");
        sid = hash(token);
        db.prepare("INSERT INTO sessions(id,expires) VALUES(?,?)").run(
          sid,
          time + SESSION_SECONDS * 1000,
        );
        cookie = {
          "Set-Cookie": `arc_genesis_review=${token}; HttpOnly; SameSite=Strict; Path=${PREFIX}; Max-Age=${SESSION_SECONDS}${url.protocol === "https:" ? "; Secure" : ""}`,
        };
      }
      const items = db
        .prepare("SELECT * FROM orders WHERE sid=? ORDER BY created DESC")
        .all(sid)
        .map(libraryItem);
      event(sid, "preview_library_viewed", time);
      return json(
        { items, mode: MODE, offer: publicOffer(product) },
        200,
        cookie,
      );
    }
    if (!session)
      return error(
        "Open the review library to start or renew this browser session.",
        401,
      );
    if (action === "checkout") {
      const key = request.headers.get("idempotency-key") || "";
      if (!/^[A-Za-z0-9_-]{8,100}$/.test(key))
        return error("A valid idempotency key is required.", 400);
      const input = await readCheckout(request);
      if (input instanceof Response) return input;
      if (input.fileSha256 !== product.sha256 || input.licenseSha256 !== product.licenseSha256)
        return json({ code: "offer_changed", error: "The edition or license changed. Review the current version." }, 409);
      db.exec("BEGIN IMMEDIATE");
      try {
        const priorRequest = db
          .prepare(
            "SELECT orders.* FROM requests JOIN orders ON orders.id=requests.order_id WHERE requests.sid=? AND requests.key=?",
          )
          .get(sid, key);
        if (
          priorRequest &&
          (priorRequest.file_hash !== product.sha256 ||
            priorRequest.terms_hash !== product.licenseSha256)
        ) {
          db.exec("ROLLBACK");
          return error(
            "The edition changed. Reload the checkout and review its terms.",
            409,
          );
        }
        const prior =
          priorRequest ||
          db
            .prepare(
              "SELECT * FROM orders WHERE sid=? AND file_hash=? AND terms_hash=?",
            )
            .get(sid, product.sha256, product.licenseSha256);
        if (prior && prior.canceled !== null) {
          db.exec("ROLLBACK");
          return error(
            "This review grant was canceled. Start a new browser session for a fresh rehearsal.",
            409,
          );
        }
        const orderId = prior?.id || randomUUID();
        if (!prior) {
          db.prepare(
            "INSERT INTO orders(id,sid,sku,title,file_hash,terms_hash,created) VALUES(?,?,?,?,?,?,?)",
          ).run(
            orderId,
            sid,
            product.sku,
            product.title,
            product.sha256,
            product.licenseSha256,
            time,
          );
          event(sid, "preview_checkout_confirmed", time, orderId);
          event(sid, "preview_access_granted", time, orderId);
        }
        db.prepare(
          "INSERT OR IGNORE INTO requests(sid,key,order_id) VALUES(?,?,?)",
        ).run(sid, key, orderId);
        db.exec("COMMIT");
        return json(
          {
            orderId,
            mode: MODE,
            chargedCents: 0,
            libraryUrl: "/account/library",
          },
          prior ? 200 : 201,
        );
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    }
    const row = db
      .prepare("SELECT * FROM orders WHERE id=? AND sid=?")
      .get(id, sid);
    if (!row) return error("Review item not found.", 404);
    if (action === "cancel") {
      if (row.canceled === null) {
        db.prepare("UPDATE orders SET canceled=? WHERE id=?").run(time, id);
        event(sid, "preview_access_canceled", time, id);
      }
      return json({
        orderId: id,
        mode: MODE,
        status: "canceled",
        refundedCents: 0,
      });
    }
    if (action === "receipt") {
      const receipt = {
        mode: MODE,
        currency: "EUR",
        chargedCents: 0,
        paymentProvider: null,
        orderId: id,
        sku: row.sku,
        title: row.title,
        fileSha256: row.file_hash,
        permissionSha256: row.terms_hash,
        acceptedAt: new Date(row.created).toISOString(),
        accepted: {
          license: true,
          immediateDelivery: true,
          acknowledgeWithdrawal: true,
        },
        status: row.canceled === null ? "available" : "canceled",
        notice: "Private review confirmation. No payment or sale occurred.",
      };
      return json(receipt, 200, {
        "Content-Disposition":
          'attachment; filename="genesis-review-receipt.json"',
      });
    }
    if (row.canceled !== null)
      return error("This review grant has been canceled.", 410);
    if (
      row.file_hash !== product.sha256 ||
      row.terms_hash !== product.licenseSha256
    )
      return escrowError();
    const isFile = action === "download";
    event(
      sid,
      isFile ? "preview_download_served" : "preview_permission_served",
      time,
      id,
    );
    return new Response(isFile ? product.bytes : product.licenseBytes, {
      headers: {
        ...headers,
        "Content-Disposition": `attachment; filename="${isFile ? product.filename : "genesis-permission.txt"}"`,
        "Content-Type": isFile ? product.type : "text/plain; charset=utf-8",
        "Content-Digest":
          "sha-256=:" +
          Buffer.from(
            isFile ? product.sha256 : product.licenseSha256,
            "hex",
          ).toString("base64") +
          ":",
      },
    });
  }
  return { handle, close: () => db.close() };
}

let local;
export async function handleRehearsal(
  request,
  environment = process.env,
  appRoot = process.cwd(),
) {
  if (!rehearsalEnabled(environment, request.url))
    return error("Not available.", 404);
  try {
    if (!local) {
      const directory =
        environment.ARCANEA_GENESIS_REVIEW_STATE ||
        mkdtempSync(join(tmpdir(), "arcanea-genesis-review-"));
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      local = openRehearsal({
        dbPath: join(directory, "review.sqlite"),
        offer: () => loadRehearsalOffer(environment, resolve(appRoot)),
      });
    }
    return await local.handle(request);
  } catch {
    return error(
      "Review storage is unavailable. Retry with the same request identifier.",
      503,
    );
  }
}
