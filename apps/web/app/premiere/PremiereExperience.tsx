"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type {
  CanonGateEntry,
  CanonWisdomEntry,
  LoadedLegend,
} from "@/lib/premiere/legends-loader";
import {
  ARTIST_CLIMATES,
  HOUSE_CODEX_PROMISE,
  HOUSE_CODEX_STAGES,
} from "@/lib/premiere/house-codex";

interface PremiereExperienceProps {
  legends: LoadedLegend[];
  gates: CanonGateEntry[];
  wisdoms: CanonWisdomEntry[];
}

type ElementClimate = "void-spirit" | "fire" | "water" | "earth" | "wind";

const ELEMENT_CLIMATES: Record<
  ElementClimate,
  { label: string; borderClass: string; badgeClass: string; quoteClass: string }
> = {
  "void-spirit": {
    label: "Void / Spirit",
    borderClass: "border-amber-300/30",
    badgeClass: "text-amber-300",
    quoteClass: "border-amber-300/60",
  },
  fire: {
    label: "Fire",
    borderClass: "border-orange-400/35",
    badgeClass: "text-orange-300",
    quoteClass: "border-orange-400/70",
  },
  water: {
    label: "Water",
    borderClass: "border-cyan-400/35",
    badgeClass: "text-cyan-300",
    quoteClass: "border-cyan-400/70",
  },
  earth: {
    label: "Earth",
    borderClass: "border-emerald-400/35",
    badgeClass: "text-emerald-300",
    quoteClass: "border-emerald-400/70",
  },
  wind: {
    label: "Wind",
    borderClass: "border-slate-300/35",
    badgeClass: "text-slate-200",
    quoteClass: "border-slate-300/70",
  },
};

const BOOKMARK_STORAGE_KEY = "arcanea.premiere.bookmark.v1";

function cleanProseParagraph(raw: string): string {
  return raw.replace(/\*\*/g, "").replace(/\*/g, "");
}

export function PremiereExperience({ legends, gates, wisdoms }: PremiereExperienceProps) {
  const [selectedLegendId, setSelectedLegendId] = useState<string>(legends[0]?.id ?? "first-dawn");
  const [selectedGateIndex, setSelectedGateIndex] = useState<number>(0);
  const [elementClimate, setElementClimate] = useState<ElementClimate>("void-spirit");
  const [fontScale, setFontScale] = useState<"compact" | "reading" | "large">("reading");
  const [bookmarkNote, setBookmarkNote] = useState<string>("");
  const [playingFreq, setPlayingFreq] = useState<number | null>(null);
  const [playingMotif, setPlayingMotif] = useState<boolean>(false);
  const [audioStatus, setAudioStatus] = useState<string>("");

  function selectLegend(legendId: string) {
    setSelectedLegendId(legendId);
    try {
      window.localStorage.setItem(
        BOOKMARK_STORAGE_KEY,
        JSON.stringify({ legendId, elementClimate }),
      );
    } catch {
      // Ignore storage quota / private mode
    }
  }

  function saveOrResumeBookmark(action: "save" | "resume") {
    try {
      if (action === "save") {
        window.localStorage.setItem(
          BOOKMARK_STORAGE_KEY,
          JSON.stringify({ legendId: selectedLegendId, elementClimate }),
        );
        setBookmarkNote("Reading position saved on this device.");
        return;
      }
      const raw = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);
      if (!raw) {
        setBookmarkNote("No saved reading bookmark on this device yet.");
        return;
      }
      const parsed = JSON.parse(raw) as { legendId?: string; elementClimate?: ElementClimate };
      if (parsed.legendId && legends.some((l) => l.id === parsed.legendId)) {
        setSelectedLegendId(parsed.legendId);
      }
      if (parsed.elementClimate && parsed.elementClimate in ELEMENT_CLIMATES) {
        setElementClimate(parsed.elementClimate);
      }
      setBookmarkNote("Restored your saved Legend and Element climate.");
    } catch {
      setBookmarkNote("Browser storage unavailable.");
    }
  }

  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopNodesRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (stopNodesRef.current) {
        stopNodesRef.current();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  function stopAudio() {
    if (stopNodesRef.current) {
      stopNodesRef.current();
      stopNodesRef.current = null;
    }
    setPlayingFreq(null);
    setPlayingMotif(false);
  }

  function ensureAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new Ctor();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function toggleGateTone(gate: CanonGateEntry) {
    if (playingFreq === gate.frequencyHz) {
      stopAudio();
      setAudioStatus(`Stopped ${gate.gate} Gate tone.`);
      return;
    }
    stopAudio();
    const ctx = ensureAudioContext();
    if (!ctx) {
      setAudioStatus("Web Audio is unavailable in this browser.");
      return;
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.08, now + 0.35);

    const oscFundamental = ctx.createOscillator();
    oscFundamental.type = "sine";
    oscFundamental.frequency.setValueAtTime(gate.frequencyHz, now);

    const oscFifth = ctx.createOscillator();
    oscFifth.type = "triangle";
    oscFifth.frequency.setValueAtTime(gate.frequencyHz * 1.5, now);

    const fifthGain = ctx.createGain();
    fifthGain.gain.setValueAtTime(0.18, now);

    oscFundamental.connect(masterGain);
    oscFifth.connect(fifthGain);
    fifthGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    oscFundamental.start(now);
    oscFifth.start(now);

    const autoStopTimer = window.setTimeout(() => {
      stopAudio();
      setAudioStatus(`${gate.gate} Gate reference completed.`);
    }, 6000);

    stopNodesRef.current = () => {
      window.clearTimeout(autoStopTimer);
      try {
        const stopAt = ctx.currentTime + 0.08;
        masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
        oscFundamental.stop(stopAt);
        oscFifth.stop(stopAt);
      } catch {
        // Ignore already-stopped nodes
      }
    };

    setPlayingFreq(gate.frequencyHz);
    setAudioStatus(`Auditioning Gate ${gate.number} (${gate.gate} · ${gate.frequencyHz} Hz — ${gate.guardian} & ${gate.godbeast}).`);
  }

  function playAgainMotif() {
    if (playingMotif) {
      stopAudio();
      setAudioStatus("Stopped AGAIN motif preview.");
      return;
    }
    stopAudio();
    const ctx = ensureAudioContext();
    if (!ctx) {
      setAudioStatus("Web Audio is unavailable in this browser.");
      return;
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 293.66, start: 0, duration: 0.45 }, // D4
      { freq: 392.0, start: 0.42, duration: 1.45 }, // G4 (rising fourth)
      { freq: 587.33, start: 0.9, duration: 1.1 }, // D5 open fifth shimmer
    ];

    const created: OscillatorNode[] = [];
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.start);
      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.08, now + note.start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.05);
      created.push(osc);
    }

    const timer = window.setTimeout(() => {
      stopAudio();
      setAudioStatus("AGAIN motif reference completed.");
    }, 2200);

    stopNodesRef.current = () => {
      window.clearTimeout(timer);
      for (const osc of created) {
        try {
          osc.stop();
        } catch {
          // Ignore already stopped
        }
      }
    };

    setPlayingMotif(true);
    setAudioStatus("Playing AGAIN aria rising-fourth motif cell (D4 -> G4 -> open fifth).");
  }

  const activeLegend = legends.find((l) => l.id === selectedLegendId) ?? legends[0];
  const activeGate = gates[selectedGateIndex] ?? gates[0];
  const activeClimate = ELEMENT_CLIMATES[elementClimate];
  const textSizeClass =
    fontScale === "compact"
      ? "text-sm leading-6"
      : fontScale === "large"
        ? "text-lg leading-8"
        : "text-base leading-7";

  return (
    <div className="mx-auto max-w-6xl space-y-20 px-4 py-12 sm:px-6 lg:py-16">
      {/* Chapter I-III Canon Reader */}
      <section aria-labelledby="canon-reader-heading" className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="font-mono text-xs text-amber-300">Legends of Arcanea · Unabridged Edition Prose</p>
            <h2 id="canon-reader-heading" className="mt-2 font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Read the First Three Legends
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <fieldset className="flex flex-wrap items-center gap-1.5 border-0 p-0">
              <legend className="sr-only">Element reading atmosphere</legend>
              {(Object.keys(ELEMENT_CLIMATES) as ElementClimate[]).map((el) => (
                <button
                  key={el}
                  type="button"
                  aria-pressed={elementClimate === el}
                  onClick={() => setElementClimate(el)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
                    elementClimate === el
                      ? "border-teal-300 bg-teal-400/15 text-teal-100"
                      : "border-white/15 bg-white/[0.03] text-zinc-300 hover:border-white/30"
                  }`}
                >
                  {ELEMENT_CLIMATES[el].label}
                </button>
              ))}
            </fieldset>
            <fieldset className="flex flex-wrap items-center gap-1.5 border-0 p-0">
              <legend className="sr-only">Reader type scale</legend>
              {(["compact", "reading", "large"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={fontScale === size}
                  onClick={() => setFontScale(size)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
                    fontScale === size
                      ? "border-amber-300 bg-amber-300/15 text-amber-100"
                      : "border-white/15 bg-white/[0.03] text-zinc-300 hover:border-white/30"
                  }`}
                >
                  {size} type
                </button>
              ))}
            </fieldset>
            <button
              type="button"
              onClick={() => saveOrResumeBookmark("resume")}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:border-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              Resume bookmark
            </button>
          </div>
        </div>
        {bookmarkNote ? (
          <output className="block font-mono text-xs text-teal-200" aria-live="polite">
            {bookmarkNote}
          </output>
        ) : null}

        <fieldset className="grid gap-3 border-0 p-0 sm:grid-cols-3">
          <legend className="sr-only">Select Legend chapter</legend>
          {legends.map((legend, index) => (
            <button
              key={legend.id}
              type="button"
              aria-pressed={activeLegend?.id === legend.id}
              onClick={() => selectLegend(legend.id)}
              className={`rounded-2xl border p-4 text-left transition motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
                activeLegend?.id === legend.id
                  ? "border-amber-300/70 bg-amber-500/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
              }`}
            >
              <span className="font-mono text-xs text-amber-300">Legend {String(index + 1).padStart(2, "0")}</span>
              <span className="mt-1 block font-serif text-xl font-semibold text-white">{legend.title}</span>
              <span className="mt-1 block font-mono text-xs text-zinc-400">
                {legend.wordCount.toLocaleString()} words · ~{legend.readingMinutes} min read
              </span>
            </button>
          ))}
        </fieldset>

        {activeLegend ? (
          <article className={`rounded-3xl border bg-[#0b0d14] p-6 sm:p-10 ${activeClimate.borderClass}`}>
            <header className="mx-auto max-w-3xl border-b border-white/10 pb-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`font-mono text-xs ${activeClimate.badgeClass}`}>
                  {activeLegend.subtitle} · {activeClimate.label} atmosphere
                </p>
                <button
                  type="button"
                  onClick={() => saveOrResumeBookmark("save")}
                  className="font-mono text-xs text-zinc-400 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  Bookmark chapter
                </button>
              </div>
              <h3 className="mt-2 font-serif text-3xl font-semibold text-white sm:text-4xl">
                {activeLegend.title}
              </h3>
              {activeLegend.epigraph ? (
                <blockquote className={`mt-5 border-l-2 pl-4 font-serif text-base italic text-amber-100/90 ${activeClimate.quoteClass}`}>
                  {cleanProseParagraph(activeLegend.epigraph)}
                </blockquote>
              ) : null}
            </header>

            <div className="mx-auto mt-8 max-w-3xl space-y-8">
              {activeLegend.id === "ten-guardians" ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-xs text-zinc-300">
                  Historical Legend II manuscript preserved verbatim below; canonical post-lock updates (Gate VII Crown 741 Hz, Gate VIII Starweave / Elara &amp; Vaelith, Gate X Shinkami &amp; Source) are enforced in the interactive Codex section.
                </p>
              ) : null}
              {activeLegend.sections.map((section, sectionIndex) => (
                <div key={`${activeLegend.id}-${sectionIndex}-${section.heading}`} className="space-y-4">
                  <h4 className="font-serif text-2xl font-medium text-amber-200">{section.heading}</h4>
                  {section.paragraphs.map((para, idx) => (
                    <p key={`${activeLegend.id}-${sectionIndex}-${idx}`} className={`${textSizeClass} text-zinc-200`}>
                      {cleanProseParagraph(para)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      {/* Ten Gates & Extended Solfeggio Codex */}
      <section aria-labelledby="gates-codex-heading" className="space-y-8">
        <div className="border-b border-white/10 pb-6">
          <p className="font-mono text-xs text-teal-300">Canonical Reference · 174 Hz - 1111 Hz</p>
          <h2 id="gates-codex-heading" className="mt-2 font-serif text-3xl font-semibold text-white sm:text-4xl">
            The Ten Gates &amp; Extended Solfeggio Codex
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-300">
            Select any Gate to inspect its canonical Guardian, bonded Godbeast, and audition its synthesized
            Solfeggio harmonic tone.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {gates.map((gate, idx) => (
              <button
                key={gate.gate}
                type="button"
                aria-pressed={selectedGateIndex === idx}
                onClick={() => setSelectedGateIndex(idx)}
                className={`rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300 ${
                  selectedGateIndex === idx
                    ? "border-teal-300 bg-teal-400/15 text-white"
                    : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
                }`}
              >
                <span className="font-mono text-[11px] text-teal-300">
                  {String(gate.number).padStart(2, "0")} · {gate.frequencyHz} Hz
                </span>
                <span className="mt-1 block text-sm font-semibold text-white">{gate.gate}</span>
                <span className="block text-xs text-zinc-400">{gate.guardian}</span>
              </button>
            ))}
          </div>

          {activeGate ? (
            <div className="rounded-2xl border border-white/15 bg-[#0d111a] p-6">
              <p className="font-mono text-xs text-amber-300">
                Gate {activeGate.number} · {activeGate.frequencyHz} Hz
              </p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-white">
                {activeGate.guardian} &amp; {activeGate.godbeast}
              </h3>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
                <div>
                  <dt className="font-mono text-xs text-zinc-400">Gate</dt>
                  <dd className="text-white">{activeGate.gate}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs text-zinc-400">Element</dt>
                  <dd className="text-white">{activeGate.element}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-mono text-xs text-zinc-400">Domain</dt>
                  <dd className="text-zinc-200">{activeGate.domain}</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleGateTone(activeGate)}
                  className="inline-flex min-h-11 items-center rounded-full bg-teal-300 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-teal-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {playingFreq === activeGate.frequencyHz
                    ? `Stop ${activeGate.frequencyHz} Hz tone`
                    : `Audition ${activeGate.frequencyHz} Hz reference`}
                </button>
                <button
                  type="button"
                  onClick={playAgainMotif}
                  className="inline-flex min-h-11 items-center rounded-full border border-amber-300/40 bg-amber-400/10 px-4 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  {playingMotif ? "Stop AGAIN motif" : "Play AGAIN motif cell"}
                </button>
              </div>
              {audioStatus ? (
                <output className="mt-3 block font-mono text-xs text-teal-200" aria-live="polite">
                  {audioStatus}
                </output>
              ) : null}
              <p className="mt-4 text-xs text-zinc-400">
                Synthesized Web Audio harmonic reference (pure sine + open fifth overtone). Studio masters release through Arcanea Records.
              </p>
            </div>
          ) : null}
        </div>

        {/* Seven Wisdoms */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {wisdoms.map((w) => (
            <div key={w.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <p className="font-serif text-base font-semibold text-white">{w.name}</p>
              <p className="font-mono text-[11px] text-amber-300">{w.archive}</p>
              <p className="mt-1 text-xs text-zinc-400">{w.domain}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Arcanea Records House Codex */}
      <section aria-labelledby="records-codex-heading" className="space-y-8">
        <div className="border-b border-white/10 pb-6">
          <p className="font-mono text-xs text-amber-300">Arcanea Records · House Codex</p>
          <h2 id="records-codex-heading" className="mt-2 font-serif text-3xl font-semibold text-white sm:text-4xl">
            {HOUSE_CODEX_PROMISE.rule}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">
            {HOUSE_CODEX_PROMISE.disclosure} {HOUSE_CODEX_PROMISE.qualityBar}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {ARTIST_CLIMATES.map((artist) => (
            <article key={artist.id} className="rounded-2xl border border-white/10 bg-[#0b0d14] p-5">
              <p className="font-mono text-xs text-teal-300">{artist.motif}</p>
              <h3 className="mt-1 font-serif text-2xl font-semibold text-white">{artist.artist}</h3>
              <p className="mt-2 text-sm text-zinc-200">{artist.climate}</p>
              <p className="mt-2 text-xs text-zinc-400">{artist.notes}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {HOUSE_CODEX_STAGES.map((stage) => (
            <div key={stage.step} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-mono text-xs text-amber-300">{stage.step} · {stage.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{stage.rule}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 pt-2 text-sm">
          <Link href="/library" className="rounded-full bg-white px-5 py-2.5 font-semibold text-zinc-950 transition motion-reduce:transition-none hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
            Browse the library
          </Link>
          <Link href="/records" className="rounded-full border border-white/20 px-5 py-2.5 font-medium text-white transition motion-reduce:transition-none hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
            Open Arcanea Records
          </Link>
          <Link href="/lore" className="rounded-full border border-white/20 px-5 py-2.5 font-medium text-white transition motion-reduce:transition-none hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
            Inspect full lore
          </Link>
        </div>
      </section>
    </div>
  );
}
