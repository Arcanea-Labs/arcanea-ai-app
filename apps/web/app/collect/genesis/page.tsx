import { GenesisRoom } from "@/components/maison/arcanea-maison";
import { requireMaisonPreview } from "@/components/maison/preview";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Genesis · Collector preview",
  robots: { index: false, follow: false },
};

export default function GenesisPage() {
  requireMaisonPreview();
  return <GenesisRoom />;
}
