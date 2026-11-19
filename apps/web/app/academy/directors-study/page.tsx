import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CutReview } from "./cut-review";
import { portrait } from "./portrait";
import styles from "./study.module.css";

export const metadata: Metadata = {
  title: "The second shot",
  description:
    "Direct a two-shot continuity study with Elara and export your storyboard brief.",
  alternates: { canonical: "/academy/directors-study" },
  openGraph: {
    title: "The second shot — Arcanea Academy",
    description:
      "A character continuity study with Elara, Guardian of Starweave.",
    images: ["/guardians/v4/elara-hero-v4.webp"],
  },
};

export default function DirectorsStudy() {
  return (
    <article className={styles.study}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link href="/academy">Academy</Link>
        <span aria-hidden="true">/</span> Director’s study
      </nav>
      <header className={styles.hero}>
        <div className={styles.heroImage}>
          <Image
            src={portrait}
            alt="Elara draws luminous threads between her hands."
            fill
            sizes="(max-width: 700px) 100vw, 68vw"
            priority
          />
        </div>
        <div className={styles.intro}>
          <p className={styles.kicker}>Character continuity · Study 01</p>
          <h1>The second shot</h1>
          <blockquote>
            “Watch the mark on my cheek. When you cut closer, keep it on the
            same side.”
          </blockquote>
        </div>
        <p className={styles.credit}>
          <strong>Elara</strong>Guardian of Starweave
        </p>
      </header>
      <CutReview />
      <details className={styles.notes}>
        <summary>Study notes and image credits</summary>
        <p>
          Original teaching exercise and dialogue featuring Elara. The
          candidates use crops of a single Arcanea illustration. Mirroring and
          desaturation isolate different continuity errors. Timing is a
          direction for future footage.
        </p>
        <a href={portrait}>View the original portrait</a>
      </details>
    </article>
  );
}
