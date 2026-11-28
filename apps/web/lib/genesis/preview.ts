import { notFound } from "next/navigation";

export function requireGenesisPreview() {
  const enabled = process.env.ARCANEA_GENESIS_PREVIEW === "1";
  const vercelPreview = process.env.VERCEL_ENV === "preview";
  const local = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
  if (!enabled || (!vercelPreview && !local)) notFound();
}

export function localRehearsalEnabled() {
  return (
    process.env.ARCANEA_GENESIS_REHEARSAL === "local" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL
  );
}
