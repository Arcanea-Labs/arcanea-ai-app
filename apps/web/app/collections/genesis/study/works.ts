import {
  FIRSTLIGHT_ASSETS,
  FIRSTLIGHT_CHARACTERS,
  publishedFirstlightAsset,
} from "@/lib/visual-encyclopedia/firstlight-02";
import { SOVEREIGN_BY_ID } from "@/lib/visual-encyclopedia/sovereign-depths";
import { containsExperimental } from "@/lib/visual-encyclopedia/sovereign-depths-schema";
import bossReceipts from "../../../../../../docs/worldbuilding/sovereign-depths/final-art-manifest-bosses.json";
import dungeonReceipts from "../../../../../../docs/worldbuilding/sovereign-depths/final-art-manifest-dungeons.json";
import selection from "./selection.json";

export const studyPath = "/collections/genesis/study";
const host = "https://www.arcanea.ai";
const source =
  "https://github.com/Arcanea-Labs/arcanea-ai-app/blob/7d39606de5e49c8316f8e0751720fd17c453613d";
const depthReceipts = [...bossReceipts, ...dungeonReceipts];

type Selection = (typeof selection)[number];
export interface Artwork extends Selection {
  rank: number;
  name: string;
  subtitle: string;
  collection: string;
  status: string;
  alt: string;
  image: string;
  sourceImage: string;
  width: number;
  height: number;
  dossier: string;
  receipt: string;
  notes: string[];
  rights: string;
}

export function resolveStudyWork(
  item: Selection,
  rank: number,
): Artwork | undefined {
  const asset = FIRSTLIGHT_ASSETS.find((entry) => entry.id === item.id);
  if (asset) {
    const person = FIRSTLIGHT_CHARACTERS.find(
      (entry) => entry.id === asset.character_id,
    );
    const release = person && publishedFirstlightAsset(person, asset.kind);
    if (!person || !release?.url || release.sha256 !== item.revision) return;
    return {
      ...item,
      rank,
      name: person.name,
      subtitle: person.title,
      collection: "Firstlight II",
      status: "Experimental proposal",
      image: release.url,
      sourceImage: release.url,
      width: release.width,
      height: release.height,
      alt: release.alt,
      dossier:
        host +
        "/gallery/firstlight-02?character=" +
        person.slug +
        "&view=" +
        asset.kind,
      receipt: host + "/firstlight-02/review-queue.json",
      notes: release.continuity_notes ?? [],
      rights:
        "Approved for the public concept exhibition. Final human art approval and commercial rights review are pending.",
    };
  }
  const entry = SOVEREIGN_BY_ID.get(item.id);
  const receipt = depthReceipts.find((record) => record.id === item.id);
  if (
    !entry ||
    !receipt ||
    containsExperimental(entry) ||
    entry.canonStatus !== "STAGING" ||
    receipt.status !== "reviewed-gallery-key-art" ||
    receipt.image.renditionSha256 !== item.revision ||
    receipt.image.sourceSha256 !== entry.image.sourceSha256 ||
    entry.image.renditionSha256 !== item.revision ||
    receipt.image.src !== entry.image.src
  )
    return;
  return {
    ...item,
    rank,
    name: entry.name,
    subtitle: entry.title,
    collection: "Sovereign Depths",
    status: "Staging",
    image: entry.image.src,
    sourceImage: host + entry.image.src,
    alt: entry.image.alt,
    width: entry.image.width,
    height: entry.image.height,
    dossier: host + "/gallery/sovereign-depths/" + entry.slug,
    receipt:
      source +
      "/docs/worldbuilding/sovereign-depths/final-art-manifest-" +
      (entry.kind === "boss" ? "bosses" : "dungeons") +
      ".json",
    notes: [],
    rights:
      "The owner authorized gallery publication after independent visual review. Collector download and commercial rights are unverified.",
  };
}

export const works = selection.flatMap((entry, index) => {
  const work = resolveStudyWork(entry, index + 1);
  return work ? [work] : [];
});
