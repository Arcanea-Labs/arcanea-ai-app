/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation applies and removes the Atlas-only CSP. */
import { AtlasReview } from '@/components/atlas/atlas-review';
import '../atlas.css';
export default function ReviewPage() {
  return <div className="atlas-root"><div className="atlas-review-page"><a href="/atlas/world">← Return to the world</a><h1>Review changes at the source.</h1><p>Private worlds use your existing Arcanea account. Imports and agent proposals remain provisional. Only the world owner can approve an exact proposal hash and base revision. This workflow does not modify the locked Arcanea vault.</p><AtlasReview/></div></div>;
}
