import { Metadata } from "next";
import {
  getCanonicalRealms,
  getLinguisticFamilies,
  getCanonicalEpochs,
  getCanonicalGuardians,
  getMonomythStages,
  projectAtlasStaging,
} from "@arcanea/world-engine";
import { AtlasClient } from "./atlas-client";
import atlasFixture from "../../../../packages/world-engine/fixtures/atlas-staging.json";

export const metadata: Metadata = {
  title: "Multiverse Atlas — Realms, Corridors & Dialects — Arcanea",
  description:
    "Explore the acoustic cartography of the Kingdom of Light. Inspect Solfeggio frequency corridors, Tolkien-grade linguistic matrices, Sandersonian magic tolls, and the 12-stage Monomyth.",
  openGraph: {
    title: "Multiverse Atlas — Realms, Corridors & Dialects — Arcanea",
    description:
      "Explore the acoustic cartography of the Kingdom of Light. Inspect Solfeggio frequency corridors, Tolkien-grade linguistic matrices, Sandersonian magic tolls, and the 12-stage Monomyth.",
  },
  alternates: { canonical: "/atlas" },
};

export default function AtlasPage() {
  const realms = getCanonicalRealms();
  const linguisticFamilies = getLinguisticFamilies();
  const epochs = getCanonicalEpochs();
  const guardians = getCanonicalGuardians();
  const monomythStages = getMonomythStages();

  return (
    <>
    <div className="mx-auto max-w-7xl px-6 pt-8 text-sm">
      <a className="text-[var(--arc-brand-atlantean-teal)] underline underline-offset-4" href="/atlas/world">Explore place, time and perspective in the world engine →</a>
    </div>
    <AtlasClient
      initialRealms={realms}
      linguisticFamilies={linguisticFamilies}
      epochs={epochs}
      guardians={guardians}
      monomythStages={monomythStages}
      geographicAtlas={projectAtlasStaging(atlasFixture)}
    />
    </>
  );
}
