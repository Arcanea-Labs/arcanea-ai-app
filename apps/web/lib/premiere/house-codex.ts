export interface ArtistClimate {
  id: string;
  artist: string;
  climate: string;
  motif: string;
  notes: string;
}

export interface CodexStage {
  step: string;
  name: string;
  rule: string;
}

export const HOUSE_CODEX_PROMISE = {
  rule: "Frank writes, the machine performs.",
  disclosure:
    "Explicit authorship provenance on every release — we state where the machine played.",
  qualityBar:
    "Curated Listening Gate: most demos stay unreleased; one founder override is reserved for strange, risky compositions that refuse to fit safe tropes.",
  againMotif: {
    title: "AGAIN Aria · Goldberg Motif Cell",
    intervalRule:
      "Rising fourth (D4 293.66 Hz -> G4 392.00 Hz) resolving onto an open fifth sustained pedal.",
    tempoNote:
      "Modulates cleanly across ballad (74 BPM), atmospheric (60 BPM), and high-tempo (176 BPM) skins without rewriting the harmonic cell.",
  },
};

export const ARTIST_CLIMATES: ArtistClimate[] = [
  {
    id: "frank-riemer",
    artist: "Frank Riemer",
    climate: "Ritual and horizon — a cold morning on the water.",
    motif: "Rising fourth + acoustic piano / cello anchor",
    notes:
      "Grounded human phrasing; never padded with generic motivational tropes.",
  },
  {
    id: "franks-vibes",
    artist: "Frank's Vibes",
    climate: "Lab and training — a room built for momentum.",
    motif: "Driving percussive pocket + analog bassline",
    notes:
      "Built for deep work blocks and physical movement; subtraction before loudness.",
  },
  {
    id: "nona",
    artist: "Nona",
    climate: "Rebel — a concrete basement with a single naked bulb.",
    motif: "Dissonant minor second tension resolving into open fifth",
    notes:
      "Refuses default major-key sweetness; contradiction held inside every chorus.",
  },
  {
    id: "arcanea",
    artist: "Arcanea",
    climate: "Myth — the night sky over a world that does not exist yet.",
    motif: "Extended Solfeggio intervals (174 Hz to 1111 Hz)",
    notes:
      "Each Guardian holds one dedicated frequency, key center, and canonical motif.",
  },
];

export const HOUSE_CODEX_STAGES: CodexStage[] = [
  {
    step: "01",
    name: "Seed",
    rule: "Capture raw human voice memos rooted in a lived moment — never synthetic filler.",
  },
  {
    step: "02",
    name: "Write",
    rule: "Human-authored lyrics versioned in git; passes the read-aloud car test.",
  },
  {
    step: "03",
    name: "Compose",
    rule: "Hummed or MIDI-played topline uploaded directly as musical DNA.",
  },
  {
    step: "04",
    name: "Produce",
    rule: "Artist Bible timbre rules + stem separation + deliberate subtraction in the mix.",
  },
  {
    step: "05",
    name: "Release",
    rule: "Explicit AI/instrument credits preserved at publication time.",
  },
  {
    step: "06",
    name: "Learn",
    rule: "Metrics hold a diagnostic veto, never an artistic vote.",
  },
];
