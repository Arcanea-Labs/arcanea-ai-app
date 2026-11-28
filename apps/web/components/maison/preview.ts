import { requireGenesisPreview } from "@/lib/genesis/preview";

export function requireMaisonPreview() {
  if (process.env.VERCEL_ENV !== "preview") requireGenesisPreview();
}
