import { notFound } from "next/navigation";
import { PlateDetail } from "@/components/genesis/folio";
import { PhoenixScreenRoom } from "@/components/maison/arcanea-maison";
import { requireMaisonPreview } from "@/components/maison/preview";
import plates from "@/lib/genesis/published-plates.json";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Artwork · Arcanea Editions",
  robots: { index: false, follow: false },
};

export default async function WorkPage({
  params,
}: {
  params: Promise<{ work: string }>;
}) {
  requireMaisonPreview();
  const { work } = await params;
  if (work === "phoenix-screen") return <PhoenixScreenRoom />;
  const plate = plates.find((item) => item.slug === work);
  if (!plate) notFound();
  return (
    <PlateDetail
      plate={plate}
      collection="/collect/genesis"
      detailBase="/collect"
      studyHref="/collect/phoenix-screen"
    />
  );
}
