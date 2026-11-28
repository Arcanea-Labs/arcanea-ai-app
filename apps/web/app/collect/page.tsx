import { CollectRoom } from "@/components/maison/arcanea-maison";
import { requireMaisonPreview } from "@/components/maison/preview";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Arcanea Editions · Private preview",
  robots: { index: false, follow: false },
};

export default function CollectPage() {
  requireMaisonPreview();
  return <CollectRoom />;
}
