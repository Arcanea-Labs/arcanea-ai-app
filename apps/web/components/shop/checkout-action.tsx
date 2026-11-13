"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { submitWaitlist } from "@/lib/waitlist/submit";
import {
  SHOP_DEMAND_ROLES,
  SHOP_PRICE_BANDS,
  encodeShopWaitlistSource,
  type BuyerRoleId,
  type FairPriceBandId,
} from "@/lib/renaissance/revenue-experiment";

export function CheckoutAction({
  slug,
  available,
  released,
  previewHref,
  previewNoun = "sample",
}: {
  slug: string;
  available: boolean;
  released: boolean;
  previewHref: string;
  previewNoun?: "sample" | "gallery";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<BuyerRoleId>("worldbuilder");
  const [priceBand, setPriceBand] = useState<FairPriceBandId>("eur29");
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data: unknown = await response.json();
      if (
        !response.ok ||
        !data ||
        typeof data !== "object" ||
        !("url" in data) ||
        typeof data.url !== "string"
      ) {
        throw new Error(
          "Checkout is unavailable. Your card has not been charged.",
        );
      }
      const url = new URL(data.url);
      if (
        url.origin !== "https://buy.polar.sh" ||
        url.username ||
        url.password ||
        url.hash ||
        url.search
      ) {
        throw new Error(
          "The checkout link could not be verified. Your card has not been charged.",
        );
      }
      window.location.assign(url.href);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Checkout could not be opened.",
      );
      setBusy(false);
    }
  }
  async function handleJoinFoundingWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (waitlistBusy || waitlistDone) return;
    setWaitlistBusy(true);
    setWaitlistError("");
    const source = encodeShopWaitlistSource(slug, role, priceBand);
    const res = await submitWaitlist(email, source);
    setWaitlistBusy(false);
    if (res.success) {
      setWaitlistDone(true);
    } else {
      setWaitlistError(res.error);
    }
  }
  return (
    <div className="shop-action">
      {available ? (
        <button className="shop-button" onClick={checkout} disabled={busy}>
          {busy ? "Opening checkout…" : "Continue to secure checkout"}
        </button>
      ) : (
        <Link className="shop-button" href={previewHref}>
          Explore the {previewNoun}{" "}
        </Link>
      )}
      {!available && (
        <p className="shop-small">
          {released
            ? `Checkout is temporarily unavailable. You can explore the ${previewNoun}.`
            : "Preview edition. Sales are not open."}
        </p>
      )}
      {!available && !released && (
        <form
          onSubmit={handleJoinFoundingWaitlist}
          className="mt-4 space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
          aria-label="Founding cohort waitlist"
        >
          <p className="text-xs font-medium text-white/80">
            Join the Founding Cohort list (launch price lock + named credit in{" "}
            <code>FOUNDERS.md</code>)
          </p>
          {waitlistDone ? (
            <p role="status" className="text-xs text-[#7fffd4]">
              Your place on the Founding Cohort list is recorded.
            </p>
          ) : (
            <>
              <div className="grid gap-2">
                <label className="block text-[11px] text-white/60">
                  Your primary craft
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as BuyerRoleId)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b0e14] px-2.5 py-1.5 text-xs text-white"
                  >
                    {SHOP_DEMAND_ROLES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] text-white/60">
                  Fair one-time price band for your use
                  <select
                    value={priceBand}
                    onChange={(e) =>
                      setPriceBand(e.target.value as FairPriceBandId)
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b0e14] px-2.5 py-1.5 text-xs text-white"
                  >
                    {SHOP_PRICE_BANDS.map((band) => (
                      <option key={band.id} value={band.id}>
                        {band.label}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  aria-label="Email address for Founding Cohort list"
                  className="w-full rounded-lg border border-white/10 bg-[#0b0e14] px-2.5 py-1.5 text-xs text-white placeholder:text-white/30"
                />
              </div>
              <button
                type="submit"
                disabled={waitlistBusy}
                className="w-full rounded-lg border border-[#00bcd4]/40 bg-[#00bcd4]/15 px-3 py-1.5 text-xs font-medium text-[#00bcd4] transition-colors hover:bg-[#00bcd4]/25 disabled:opacity-50"
              >
                {waitlistBusy ? "Recording…" : "Record founding interest"}
              </button>
              {waitlistError && (
                <p role="alert" className="text-[11px] text-amber-300">
                  {waitlistError}
                </p>
              )}
            </>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="shop-small">
          {error}
        </p>
      )}
    </div>
  );
}
