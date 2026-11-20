import { Gallery } from "@/components/genesis/folio";
import { requireGenesisPreview } from "@/lib/genesis/preview";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mythic Commons · Arcanea Genesis",
  robots: { index: false, follow: false },
};

export default function GenesisCollection() {
  requireGenesisPreview();
  return <Gallery />;
}
