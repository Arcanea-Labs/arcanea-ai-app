import { CommissionRoom } from "@/components/maison/arcanea-maison";
import { requireMaisonPreview } from "@/components/maison/preview";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private world commissions · Arcanea",
  robots: { index: false, follow: false },
};

export default function CommissionsPage() {
  requireMaisonPreview();
  return <CommissionRoom />;
}
