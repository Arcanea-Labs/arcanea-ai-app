import { readFile } from "node:fs/promises";
import path from "node:path";

export interface LegendSection {
  heading: string;
  paragraphs: string[];
}

export interface LoadedLegend {
  id: string;
  fileName: string;
  title: string;
  subtitle: string;
  epigraph: string;
  wordCount: number;
  readingMinutes: number;
  sections: LegendSection[];
}

export interface CanonGateEntry {
  number: number;
  gate: string;
  frequencyHz: number;
  guardian: string;
  godbeast: string;
  domain: string;
  element: string;
}

export interface CanonWisdomEntry {
  name: string;
  archive: string;
  domain: string;
  element: string;
}

export const CANON_TEN_GATES: CanonGateEntry[] = [
  {
    number: 1,
    gate: "Foundation",
    frequencyHz: 174,
    guardian: "Lyssandria",
    godbeast: "Kaelith",
    domain: "Earth, survival",
    element: "Earth",
  },
  {
    number: 2,
    gate: "Flow",
    frequencyHz: 285,
    guardian: "Leyla",
    godbeast: "Veloura",
    domain: "Creativity, emotion",
    element: "Water",
  },
  {
    number: 3,
    gate: "Fire",
    frequencyHz: 396,
    guardian: "Draconia",
    godbeast: "Draconis",
    domain: "Power, will",
    element: "Fire",
  },
  {
    number: 4,
    gate: "Heart",
    frequencyHz: 417,
    guardian: "Maylinn",
    godbeast: "Laeylinn",
    domain: "Love, healing",
    element: "Wind / Water",
  },
  {
    number: 5,
    gate: "Voice",
    frequencyHz: 528,
    guardian: "Alera",
    godbeast: "Otome",
    domain: "Truth, expression",
    element: "Wind",
  },
  {
    number: 6,
    gate: "Sight",
    frequencyHz: 639,
    guardian: "Lyria",
    godbeast: "Yumiko",
    domain: "Intuition, vision",
    element: "Water / Void",
  },
  {
    number: 7,
    gate: "Crown",
    frequencyHz: 741,
    guardian: "Aiyami",
    godbeast: "Sol",
    domain: "Enlightenment",
    element: "Spirit / Light",
  },
  {
    number: 8,
    gate: "Starweave",
    frequencyHz: 852,
    guardian: "Elara",
    godbeast: "Vaelith",
    domain: "Perspective, transformation",
    element: "Void",
  },
  {
    number: 9,
    gate: "Unity",
    frequencyHz: 963,
    guardian: "Ino",
    godbeast: "Kyuro",
    domain: "Partnership",
    element: "All",
  },
  {
    number: 10,
    gate: "Source",
    frequencyHz: 1111,
    guardian: "Shinkami",
    godbeast: "Source",
    domain: "Meta-consciousness",
    element: "Spirit",
  },
];

export const CANON_SEVEN_WISDOMS: CanonWisdomEntry[] = [
  {
    name: "Sophron",
    archive: "Form",
    domain: "Structure, patterns",
    element: "Earth",
  },
  {
    name: "Kardia",
    archive: "Flow",
    domain: "Emotion, heart",
    element: "Water",
  },
  {
    name: "Valora",
    archive: "Transformation",
    domain: "Courage, change",
    element: "Fire",
  },
  {
    name: "Eudaira",
    archive: "Freedom",
    domain: "Joy, liberation",
    element: "Wind",
  },
  {
    name: "Orakis",
    archive: "Mystery",
    domain: "Vision, intuition",
    element: "Void",
  },
  {
    name: "Poiesis",
    archive: "Consciousness",
    domain: "Creation, craft",
    element: "Light",
  },
  {
    name: "Enduran",
    archive: "Unity",
    domain: "Endurance, completion",
    element: "All",
  },
];

export const CANON_MAGIC_RANKS = [
  { gates: "0-2", rank: "Apprentice" },
  { gates: "3-4", rank: "Mage" },
  { gates: "5-6", rank: "Master" },
  { gates: "7-8", rank: "Archmage" },
  { gates: "9-10", rank: "Luminor" },
];

const LEGEND_SPECS = [
  { id: "first-dawn", fileName: "I_THE_FIRST_DAWN.md" },
  { id: "ten-guardians", fileName: "II_THE_TEN_GUARDIANS.md" },
  { id: "great-darkness", fileName: "III_THE_GREAT_DARKNESS.md" },
] as const;

async function resolveLegendsDir(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), "../../book/legends-of-arcanea"),
    path.resolve(process.cwd(), "book/legends-of-arcanea"),
  ];
  for (const candidate of candidates) {
    try {
      await readFile(path.join(candidate, "I_THE_FIRST_DAWN.md"), "utf-8");
      return candidate;
    } catch {
      // Try next candidate path
    }
  }
  throw new Error("Unable to locate book/legends-of-arcanea directory.");
}

function parseLegendMarkdown(
  id: string,
  fileName: string,
  raw: string,
): LoadedLegend {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let title = fileName;
  let subtitle = "";
  const epigraphLines: string[] = [];
  const sections: LegendSection[] = [];
  let currentSection: LegendSection = { heading: "Opening", paragraphs: [] };
  let buffer: string[] = [];
  let seenBodyHeading = false;

  const flushParagraph = () => {
    const text = buffer.join(" ").trim();
    if (text) {
      currentSection.paragraphs.push(text);
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!seenBodyHeading && trimmed.startsWith("# ") && title === fileName) {
      title = trimmed.slice(2).trim();
      continue;
    }
    if (!seenBodyHeading && trimmed.startsWith("## ") && !subtitle) {
      subtitle = trimmed.slice(3).trim();
      continue;
    }
    if (!seenBodyHeading && trimmed.startsWith(">")) {
      epigraphLines.push(trimmed.slice(1).trim());
      continue;
    }
    if (trimmed === "---") {
      flushParagraph();
      continue;
    }
    if (/^#{1,3}\s+/.test(trimmed)) {
      flushParagraph();
      if (currentSection.paragraphs.length > 0 || seenBodyHeading) {
        sections.push(currentSection);
      }
      seenBodyHeading = true;
      currentSection = {
        heading: trimmed.replace(/^#{1,3}\s+/, "").trim(),
        paragraphs: [],
      };
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    seenBodyHeading = true;
    buffer.push(trimmed);
  }
  flushParagraph();
  if (currentSection.paragraphs.length > 0) {
    sections.push(currentSection);
  }

  const allText = sections
    .flatMap((s) => [s.heading, ...s.paragraphs])
    .join(" ");
  const wordCount = allText.split(/\s+/).filter(Boolean).length;

  return {
    id,
    fileName,
    title,
    subtitle: subtitle || "The Legends of Arcanea",
    epigraph: epigraphLines.join(" "),
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / 220)),
    sections,
  };
}

export async function loadFirstDropLegends(): Promise<LoadedLegend[]> {
  const dir = await resolveLegendsDir();
  const loaded: LoadedLegend[] = [];
  for (const spec of LEGEND_SPECS) {
    const raw = await readFile(path.join(dir, spec.fileName), "utf-8");
    loaded.push(parseLegendMarkdown(spec.id, spec.fileName, raw));
  }
  return loaded;
}
