import { Collection } from "./exhibition";
import { requireStudyPreview } from "./gate";
import { works } from "./works";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Genesis · The exhibition study",
  robots: { index: false, follow: false },
};
export default function StudyPage() {
  requireStudyPreview();
  return <Collection items={works} />;
}
