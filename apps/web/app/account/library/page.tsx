import { Shell, HeldEdition } from "@/components/genesis/folio";
import { Practice } from "@/components/genesis/practice";
import {
  requireGenesisPreview,
  localRehearsalEnabled,
} from "@/lib/genesis/preview";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Genesis rehearsal library",
  robots: { index: false, follow: false },
};

export default function GenesisLibrary() {
  requireGenesisPreview();
  return (
    <Shell>
      {localRehearsalEnabled() ? <Practice library /> : <HeldEdition library />}
    </Shell>
  );
}
