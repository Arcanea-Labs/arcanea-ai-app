# Genesis collector review

Owner: Arcanea publisher. Tracking: #754, #756, #757 and #758. This branch is a private-review candidate for the existing Arcanea app. Start with the published Mythic Commons field plates, then rehearse a delivery. The source catalog and Polar checkout gate remain the commercial authority. An order in this rehearsal records zero euros and is never sent to a payment processor.

## Run

Use the Node and pnpm versions declared in the checkout. Install the frozen workspace and run the normal web app from the repository root. Use loopback only when enabling the rehearsal. The stock source sample exercises delivery without any private file. To test the actual folio, set all four path and hash variables before starting the app. A partial or stale configuration refuses delivery.

```bash
pnpm install --frozen-lockfile
export ARCANEA_GENESIS_PREVIEW=1
export ARCANEA_GENESIS_REHEARSAL=local
# Optional for the private edition, supplied from the release packet:
# ARCANEA_GENESIS_PREVIEW_ZIP           absolute private ZIP path
# ARCANEA_GENESIS_PREVIEW_SHA256        approved bytes for this rehearsal
# ARCANEA_GENESIS_PREVIEW_LICENSE       absolute rights text path
# ARCANEA_GENESIS_PREVIEW_LICENSE_SHA256
pnpm --filter @arcanea/web exec next dev --hostname 127.0.0.1 --port 3001
```

Open `/collections/genesis`, select Phoenix and open `/collect/genesis-digital`. The library route is `/account/library`. Its four-hour local session covers this rehearsal only. Ordinary shop entitlements and account history stay with the owning systems. A Vercel production deployment denies these preview surfaces.

For byte-verified local media, set `ARCANEA_GENESIS_PREVIEW_MEDIA_DIR` to a review directory holding only `published-<slug>.webp` and the museum’s `1986.2.1_web.jpg`. The downloaded files must match the hashes in the view. Hosted preview reads use the image optimizer and the allowlisted upstreams.

The ten published file records in the view are a projection. Their stable IDs and public rendition digests can be checked against the private DAM export, which remains outside the repository. Each description concerns a folklore reconstruction. The historical CC0 source and its edited study are separately credited. No unpublished image, alternate account registry, rights approval or R2 promotion is created here.

## Operator review

`/admin/assets` and `/admin/releases` render two operator-supplied self-contained HTML snapshots. They require local rehearsal mode, a loopback Host, the HTTP Basic username `reviewer`, a locally generated random password of at least 32 characters and a SHA-256 for the respective file. Set `ARCANEA_GENESIS_REVIEW_PASSWORD` and the pairs `ARCANEA_GENESIS_ASSET_REVIEW_HTML` / `ARCANEA_GENESIS_ASSET_REVIEW_SHA256` and `ARCANEA_GENESIS_RELEASE_REVIEW_HTML` / `ARCANEA_GENESIS_RELEASE_REVIEW_SHA256`. Keep the password and snapshot paths outside source control. The renderer verifies bytes on every request and confines the file to a sandboxed document with network requests blocked. A reviewer can inspect evidence there. Promotion and approval use existing governance.

## Verification

```bash
node --test scripts/test-genesis-commerce.mjs scripts/test-genesis-operator.mjs
node --import tsx --test scripts/test-genesis-offer.mts
node scripts/verify-genesis-plates.mjs "$GENESIS_INVENTORY" "$GENESIS_RENDITIONS"
```

Run the file-verification command only with the privately supplied inventory and editorial renditions. Existing shop and Polar event tests cover existing release gates and webhook handling. A real Polar sandbox purchase, failure, recovery and refund for this SKU still require separate provider evidence. An operator can roll back by removing the local flags and reverting this branch. No database migration or provider rollback is required.
