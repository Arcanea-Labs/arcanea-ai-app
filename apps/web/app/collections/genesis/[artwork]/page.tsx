import { notFound } from "next/navigation";
import { PlateDetail } from "@/components/genesis/folio";
import { requireGenesisPreview } from "@/lib/genesis/preview";
import plates from "@/lib/genesis/published-plates.json";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Published field plate · Arcanea Genesis",
  robots: { index: false, follow: false },
};

export default async function Artwork({
  params,
}: {
  params: Promise<{ artwork: string }>;
}) {
  requireGenesisPreview();
  const { artwork } = await params;
  const plate = plates.find((p) => p.slug === artwork);
  if (!plate) notFound();
  return <PlateDetail plate={plate} />;
}
