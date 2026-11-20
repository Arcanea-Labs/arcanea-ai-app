import { notFound } from "next/navigation";
import { ArtworkDetail } from "../exhibition";
import { requireStudyPreview } from "../gate";
import { works } from "../works";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Genesis · Artwork study",
  robots: { index: false, follow: false },
};
export default async function StudyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireStudyPreview();
  const { id } = await params;
  const item = works.find((entry) => entry.id === id);
  if (!item) notFound();
  return <ArtworkDetail work={item} items={works} />;
}
