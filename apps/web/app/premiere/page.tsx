import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CANON_SEVEN_WISDOMS,
  CANON_TEN_GATES,
  loadFirstDropLegends,
} from "@/lib/premiere/legends-loader";
import { PremiereExperience } from "./PremiereExperience";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "First Drop Premiere — Legends of Arcanea & House Codex",
  description:
    "Read the opening three chapters of Legends of Arcanea, explore the Ten Gates Solfeggio codex, and inspect the Arcanea Records House Codex.",
  alternates: { canonical: "/premiere" },
  openGraph: {
    title: "Arcanea First Drop Premiere",
    description:
      "Interactive edition reader for Legends of Arcanea I-III paired with the Ten Gates harmonic codex and Arcanea Records authorship principles.",
    images: ["/brand/arcanea-dashboard-hero-premium.png"],
  },
};

export default async function PremierePage() {
  const legends = await loadFirstDropLegends();
  const totalWords = legends.reduce((sum, legend) => sum + legend.wordCount, 0);

  return (
    <main className="min-h-dvh bg-[#06070b] text-white">
      <header className="relative isolate overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-24 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-32 lg:pb-24">
          <div>
            <p className="font-mono text-xs text-amber-300">
              Arcanea First Drop · {legends.length} Legends ·{" "}
              {totalWords.toLocaleString()} words on disk
            </p>
            <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Enter through a finished world, not a promise.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              Read the canonical opening movements of{" "}
              <em>Legends of Arcanea</em> directly from the source manuscripts,
              audition the 174 Hz - 1111 Hz Solfeggio intervals, and inspect the
              human-led rules behind Arcanea Records.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#canon-reader-heading"
                className="inline-flex min-h-11 items-center rounded-full bg-amber-300 px-6 text-sm font-semibold text-zinc-950 transition motion-reduce:transition-none hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                Read Legend I now
              </a>
              <Link
                href="/books"
                className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition motion-reduce:transition-none hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                Explore books
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0b0d14]">
              <Image
                src="/brand/arcanea-dashboard-hero-premium.png"
                alt="Arcanea Premiere cosmos horizon artwork"
                width={1200}
                height={675}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0b0d14] p-4">
              <Image
                src="/brand/arcanea-collectible-reliquary-premium.png"
                alt="Arcanea collectible reliquary artifact"
                width={96}
                height={96}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
              <div>
                <p className="font-mono text-xs text-teal-300">
                  Locked Canon · Primordial Duality
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                  Lumina (Form-Giver) and Nero (Fertile Unknown — never evil).
                  All darkness traces to Malachar&apos;s corruption of the Void.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <PremiereExperience
        legends={legends}
        gates={CANON_TEN_GATES}
        wisdoms={CANON_SEVEN_WISDOMS}
      />
    </main>
  );
}
