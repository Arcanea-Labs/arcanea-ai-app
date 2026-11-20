"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import s from "./folio.module.css";

type Offer = {
  title: string;
  description: string;
  filename: string;
  license: string;
  sha256: string;
  licenseSha256: string;
  termsUrl: string;
};
type Item = {
  orderId: string;
  title: string;
  downloadUrl: string;
  licenseUrl: string;
  receiptUrl: string;
};
type Shelf = { offer: Offer; items: Item[] };
const base = "/api/genesis/preview";
const checkoutPath = "/collect/genesis-digital";

export function Practice({ library = false }: { library?: boolean }) {
  const [shelf, setShelf] = useState<Shelf>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const key = useRef("");
  const inflight = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    setShelf(undefined);
    setError("");
    fetch(base + "/library", {
      credentials: "same-origin",
      cache: "no-store",
      signal: abort.signal,
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "This delivery rehearsal is available only in the private review environment.",
          );
        const data: Shelf = await r.json();
        if (!data.offer?.title || !data.offer.sha256 || !data.offer.licenseSha256 || !Array.isArray(data.items))
          throw new Error("The delivery manifest could not be loaded.");
        setShelf(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [reload]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inflight.current || submitted || !shelf) return;
    inflight.current = true;
    setLoading(true);
    setError("");
    const f = new FormData(event.currentTarget);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const r = await fetch(base + "/checkout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key.current,
        },
        body: JSON.stringify({
          edition: "genesis-digital",
          fileSha256: shelf.offer.sha256,
          licenseSha256: shelf.offer.licenseSha256,
          acceptLicense: f.has("license"),
          immediateDelivery: f.has("immediate"),
          acknowledgeWithdrawal: f.has("withdrawal"),
        }),
      });
      if (r.status === 409 && (await r.json()).code === "offer_changed") {
        key.current = "";
        setShelf(undefined);
        setError("The edition or its license changed. Reload the details and confirm the new version.");
        return;
      }
      if (!r.ok)
        throw new Error(
          r.status === 401
            ? "Your rehearsal session has expired. Reload this page and try again."
            : "Delivery could not be confirmed. Try again with the same request.",
        );
      const result = await r.json();
      if (!result.orderId)
        throw new Error("The delivery receipt could not be confirmed.");
      setSubmitted(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Delivery could not be confirmed.",
      );
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }

  return (
    <div className={s.reading}>
      <Link href="/collections/genesis" className={s.textLink}>
        Back to the collection
      </Link>
      <p className={s.kicker}>
        {library ? "Collector library" : "Digital edition · Delivery rehearsal"}
      </p>
      <h1>{library ? "Your library" : "Inside the edition"}</h1>
      <p className={s.lede}>
        {library
          ? "Your preview files, licenses and receipts live in this browser session."
          : "Try the delivery for €0. The Mythic Commons field plates are on view as editorial references. A purchase license for those plates is pending."}
      </p>
      {error && (
        <div role="alert" className={s.notice}>
          <p>{error}</p>
          {!shelf && (
            <button
              className={s.textLink}
              onClick={() => setReload((r) => r + 1)}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {!shelf && !error && <p role="status">Opening the delivery manifest…</p>}
      {shelf &&
        library &&
        (shelf.items.length ? (
          <ul className={s.shelf}>
            {shelf.items.map((i) => (
              <li key={i.orderId}>
                <p className={s.label}>Rehearsal delivery</p>
                <h2>{i.title}</h2>
                <div className={s.actions}>
                  <a className={s.button} href={i.downloadUrl}>
                    Download file
                  </a>
                  <a className={s.textLink} href={i.licenseUrl}>
                    License
                  </a>
                  <a className={s.textLink} href={i.receiptUrl}>
                    Receipt
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={s.notice}>
            <h2>Your shelf is empty</h2>
            <p>Try delivery to add the sample and its license.</p>
            <Link href={checkoutPath} className={s.textLink}>
              Open delivery rehearsal
            </Link>
          </div>
        ))}
      {shelf && !library && (
        <>
          <div className={s.notice}>
            <p className={s.label}>In this download</p>
            <h2>{shelf.offer.title}</h2>
            <p>{shelf.offer.description}</p>
            <p className={s.filename}>{shelf.offer.filename}</p>
            {shelf.offer.license && (
              <details className={s.drawer}>
                <summary>Read the practice license</summary>
                <p className={s.license}>{shelf.offer.license}</p>
                <a
                  className={s.textLink}
                  href={shelf.offer.termsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the full license in a new tab
                </a>
              </details>
            )}
          </div>
          {submitted ? (
            <div role="status" className={s.notice}>
              <h2>Delivery confirmed</h2>
              <p>The practice file, license and receipt are ready.</p>
              <Link className={s.button} href="/account/library">
                Open my library
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className={s.form}>
              <fieldset>
                <legend>Delivery preferences</legend>
                <label>
                  <input name="license" type="checkbox" required />I accept the
                  displayed practice license.
                </label>
                <label>
                  <input name="immediate" type="checkbox" required />
                  Deliver the practice file immediately.
                </label>
                <label>
                  <input name="withdrawal" type="checkbox" required />I
                  understand this rehearsal delivers immediately and creates a
                  €0 test receipt. No paid purchase or statutory waiver takes
                  place.
                </label>
              </fieldset>
              <button className={s.button} type="submit" disabled={loading}>
                {loading
                  ? "Confirming delivery…"
                  : "Rehearse checkout · €0 charged"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
