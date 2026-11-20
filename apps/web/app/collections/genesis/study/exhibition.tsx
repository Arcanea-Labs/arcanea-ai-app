import Image from "next/image";
import type { ReactNode } from "react";
import type { Artwork } from "./works";
import { studyPath } from "./works";
import styles from "./exhibition.module.css";

const number = (rank: number) => String(rank).padStart(2, "0");
function pathFor(work: Artwork) {
  return studyPath + "/" + work.id;
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <nav className={styles.mast} aria-label="Exhibition navigation">
        <a href={studyPath} className={styles.wordmark}>
          Arcanea <span>Genesis</span>
        </a>
        <a href={studyPath + "#works"}>Exhibition index</a>
      </nav>
      {children}
      <footer className={styles.footer}>
        <span>Arcanea Genesis</span>
        <span>Private curatorial review · 20 November 2026</span>
      </footer>
    </div>
  );
}

function Plate({ work, eager = false }: { work: Artwork; eager?: boolean }) {
  return (
    <Image
      src={work.image}
      alt={work.alt}
      width={work.width}
      height={work.height}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
    />
  );
}

export function Collection({ items }: { items: Artwork[] }) {
  const lead = items[0];
  if (!lead)
    return (
      <Frame>
        <h1 className={styles.empty}>No reviewed works are available.</h1>
      </Frame>
    );
  return (
    <Frame>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.label}>The exhibition study</p>
          <h1>
            Arcanea
            <br />
            <em>Genesis</em>
          </h1>
          <p className={styles.intro}>
            A harbour held in the curve of a tail. An instrument made of ribs.
            These worlds reveal themselves through the way their creatures live.
          </p>
          <a className={styles.action} href="#works">
            Explore {items.length} works
          </a>
        </div>
        <figure className={styles.heroArt}>
          <a href={pathFor(lead)} aria-label={"Study " + lead.name}>
            <Plate work={lead} eager />
          </a>
          <figcaption>
            <span>
              {lead.name} <i> / </i> {lead.subtitle}
            </span>
            <span>{lead.collection}</span>
          </figcaption>
        </figure>
      </div>
      <section id="works" className={styles.index}>
        <header className={styles.indexHead}>
          <div>
            <p className={styles.label}>Curator’s selection</p>
            <h2>The works</h2>
          </div>
          <p>
            Ranked for silhouette, composition and what the image tells us at
            first sight. Open a work for its full frame, review and exhibition
            record.
          </p>
        </header>
        <div className={styles.grid}>
          {items.map((work) => (
            <a key={work.id} href={pathFor(work)} className={styles.card}>
              <div className={styles.mount}>
                <Plate work={work} />
              </div>
              <div className={styles.caption}>
                <span className={styles.rank}>{number(work.rank)}</span>
                <div>
                  <h3>{work.name}</h3>
                  <p>
                    {work.collection} · {work.status}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </Frame>
  );
}

export function ArtworkDetail({
  work,
  items,
}: {
  work: Artwork;
  items: Artwork[];
}) {
  const index = items.findIndex((item) => item.id === work.id);
  const next = items[(index + 1) % items.length];
  const previous = items[(index + items.length - 1) % items.length];
  return (
    <Frame>
      <article className={styles.artwork}>
        <div className={styles.detailHead}>
          <a href={studyPath + "#works"}>All works</a>
          <span>
            {number(work.rank)} / {number(items.length)}
          </span>
        </div>
        <div className={styles.detailGrid}>
          <figure className={styles.fullPlate}>
            <Plate work={work} eager />
            <figcaption>
              {work.width} × {work.height} · Exhibition rendition
            </figcaption>
          </figure>
          <div className={styles.reading}>
            <p className={styles.label}>
              {work.collection} · {work.status}
            </p>
            <h1>{work.name}</h1>
            <p className={styles.subtitle}>{work.subtitle}</p>
            <p className={styles.observation}>{work.strength}</p>
            <div className={styles.note}>
              <h2>Display note</h2>
              <p>{work.limitation}</p>
            </div>
            <div className={styles.note}>
              <h2>Exhibition rights</h2>
              <p>{work.rights}</p>
            </div>
            <details className={styles.details}>
              <summary>Source and review</summary>
              {work.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
              <p>
                Rendition SHA-256 <code>{work.revision}</code>
              </p>
              <div className={styles.sources}>
                <a href={work.sourceImage}>Original image</a>
                <a href={work.dossier}>Arcanea dossier</a>
                <a href={work.receipt}>Exhibition receipt</a>
              </div>
            </details>
          </div>
        </div>
        <nav className={styles.paging} aria-label="Browse artworks">
          <a href={pathFor(previous)}>
            <small>Previous work</small>
            {previous.name}
          </a>
          <a href={pathFor(next)}>
            <small>Next work</small>
            {next.name}
          </a>
        </nav>
      </article>
    </Frame>
  );
}
