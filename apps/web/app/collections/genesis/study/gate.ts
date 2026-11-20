import { notFound } from "next/navigation";

export function requireStudyPreview() {
  if (process.env.VERCEL_ENV === "preview") return;
  if (!process.env.VERCEL_ENV && process.env.ARCANEA_GENESIS_PREVIEW === "1")
    return;
  notFound();
}
