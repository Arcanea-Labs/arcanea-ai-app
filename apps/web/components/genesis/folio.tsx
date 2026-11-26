import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import plates from "@/lib/genesis/published-plates.json";
import s from "./folio.module.css";
import {
  museumPlate,
  plateSource,
  localPlateCopiesEnabled,
} from "@/lib/genesis/plate-preview";
import { GENESIS_STUDY_REVIEW } from "@/lib/shop/catalog";

export const collectionPath = "/collections/genesis";
export const practicePath = "/collect/genesis-digital";
export const libraryPath = "/account/library";
export type Plate = (typeof plates)[number];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <section className={s.shell} aria-label="Arcanea Genesis">
      <header className={s.top}>
        <Link href={collectionPath} className={s.brand}>
          Arcanea <span>/</span> Genesis
        </Link>
        <nav aria-label="Genesis collection">
          <Link href={collectionPath + "#plates"}>Field plates</Link>
          <Link href={libraryPath}>My library</Link>
        </nav>
      </header>
      {children}
      <footer className={s.footer}>
        <span>Arcanea Editions</span>
        <Link href="/shop">Explore the edition shop</Link>
      </footer>
    </section>
  );
}

export function PlateImage({
  plate,
  priority = false,
  decorative = false,
}: {
  plate: Plate;
  priority?: boolean;
  decorative?: boolean;
}) {
  // Only the published collection path is allowed by the existing image optimizer.
  return (
    <Image
      src={plateSource(plate)}
      unoptimized={localPlateCopiesEnabled()}
      width={plate.width}
      height={plate.height}
      alt={decorative ? "" : plate.alt}
      sizes="(max-width: 700px) 67vw, (max-width: 980px) 40vw, 32vw"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}

export function Gallery() {
  const featured = plates[0];
  return (
    <Shell>
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <p className={s.kicker}>Arcanea Bestiary · Volume I</p>
          <h1 className={s.heroTitle}>
            The Mythic
            <br />
            <em>Commons.</em>
          </h1>
          <p className={s.lede}>
            Ten illustrated field plates follow creatures from folklore into the
            margins of a naturalist’s notebook.
          </p>
          <div className={s.actions}>
            <a className={s.button} href="#plates">
              Browse the plates <span aria-hidden="true">↓</span>
            </a>
            <Link className={s.textLink} href={practicePath}>
              The Phoenix Screen study
            </Link>
          </div>
        </div>
        <figure className={s.heroArt}>
          <div className={s.fan}>
            <div className={s.backLeft}>
              <PlateImage plate={plates[2]} decorative />
            </div>
            <div className={s.backRight}>
              <PlateImage plate={plates[1]} decorative />
            </div>
            <Link
              href={collectionPath + "/" + featured.slug}
              className={s.front}
            >
              <PlateImage plate={featured} priority />
            </Link>
          </div>
          <figcaption>
            <span>Featured plate {featured.plate}</span>
            <span>
              {featured.name} <i>/</i> {featured.subtitle}
            </span>
          </figcaption>
        </figure>
      </section>
      <section id="plates" className={s.index} aria-labelledby="plate-heading">
        <header className={s.collectionHeader}>
          <div>
            <p className={s.kicker}>Volume I · Plates 08–17</p>
            <h2 id="plate-heading">The field plates</h2>
          </div>
          <p>
            Open a plate for the full image, a closer reading and its source
            record.
          </p>
        </header>
        <div className={s.plateGrid}>
          {plates.map((p) => (
            <Link
              href={collectionPath + "/" + p.slug}
              key={p.assetId}
              className={s.plateCard}
            >
              <div className={s.mount}>
                <PlateImage plate={p} decorative />
              </div>
              <div className={s.cardText}>
                <span className={s.label}>Plate {p.plate}</span>
                <h3>{p.name}</h3>
                <p>{p.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}

export function PlateDetail({ plate }: { plate: Plate }) {
  const next = plates[(plates.indexOf(plate) + 1) % plates.length];
  return (
    <Shell>
      <div className={s.detail}>
        <figure className={s.singleArt}>
          <PlateImage plate={plate} priority />
        </figure>
        <article className={s.detailCopy}>
          <Link href={collectionPath + "#plates"} className={s.textLink}>
            All field plates
          </Link>
          <p className={s.kicker}>Mythic Commons · Plate {plate.plate}</p>
          <h1>{plate.name}</h1>
          <p className={s.subtitle}>{plate.subtitle}</p>
          <p className={s.lede}>{plate.note}</p>
          <dl className={s.data}>
            <div>
              <dt>Collection</dt>
              <dd>Arcanea Bestiary, Volume I</dd>
            </div>
            <div>
              <dt>Record</dt>
              <dd>Folklore reconstruction</dd>
            </div>
            <div>
              <dt>Published image</dt>
              <dd>
                {plate.width} × {plate.height} px · WebP
              </dd>
            </div>
          </dl>
          <details className={s.drawer}>
            <summary>Image provenance</summary>
            <p>
              The digest identifies this published rendition. The collector
              license is under review.
            </p>
            <code>{plate.sha256}</code>
            <a href={plate.src} className={s.textLink}>
              View the source image
            </a>
          </details>
          {plate.slug === "phoenix" && (
            <aside className={s.related}>
              <p className={s.label}>Related work · Museum collection</p>
              <h2>Phoenixes and Paulownia</h2>
              <Image
                src={plateSource(museumPlate)}
                unoptimized={localPlateCopiesEnabled()}
                width={900}
                height={420}
                sizes="(max-width: 700px) 90vw, 34vw"
                alt="A six-panel Japanese folding screen with a phoenix among paulownia trees on a gold ground."
              />
              <p>
                A Japanese folding screen from the late 1500s offers a second
                reading of the phoenix. The Cleveland Museum of Art releases its
                object image under CC0.
              </p>
              <a
                className={s.textLink}
                href="https://www.clevelandart.org/art/1986.2.1"
              >
                Read the museum record
              </a>
              <p>
                <Link className={s.textLink} href={practicePath}>
                  Open The Phoenix Screen study folio
                </Link>
              </p>
            </aside>
          )}
          <div className={s.actions}>
            <Link className={s.button} href={practicePath}>
              Explore the museum study
            </Link>
            <Link
              href={collectionPath + "/" + next.slug}
              className={s.textLink}
            >
              Next plate · {next.name}
            </Link>
          </div>
        </article>
      </div>
    </Shell>
  );
}

export function HeldEdition({ library = false }: { library?: boolean }) {
  return (
    <div className={s.reading}>
      <Link href={collectionPath} className={s.textLink}>
        Back to the collection
      </Link>
      <p className={s.kicker}>Read-only preview</p>
      <h1>{library ? "Collector library" : GENESIS_STUDY_REVIEW.title}</h1>
      <p className={s.lede}>
        {library
          ? "Your private downloads and receipts are available in the local delivery rehearsal."
          : GENESIS_STUDY_REVIEW.description}
      </p>
      {!library && (
        <dl className={s.data}>
          <div>
            <dt>Edition</dt>
            <dd>{GENESIS_STUDY_REVIEW.sku}</dd>
          </div>
          <div>
            <dt>Proposed retail</dt>
            <dd>€{GENESIS_STUDY_REVIEW.priceEur} · under review</dd>
          </div>
          <div>
            <dt>Checkout</dt>
            <dd>Held for merchant and release review</dd>
          </div>
        </dl>
      )}
      <div className={s.actions}>
        <Link href={collectionPath + "/phoenix"} className={s.button}>
          Read the Phoenix plate
        </Link>
      </div>
    </div>
  );
}
