import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { PlateImage } from "@/components/genesis/folio";
import plates from "@/lib/genesis/published-plates.json";
import {
  localPlateCopiesEnabled,
  museumPlate,
  plateSource,
} from "@/lib/genesis/plate-preview";
import styles from "./maison.module.css";

const museum = "https://www.clevelandart.org/art/1986.2.1";
const enquiryAddress = "hello@arcanea.ai";
const commissionBrief = [
  "What is the world or story for?",
  "Who is it for and how will they encounter it?",
  "What would make the first delivery useful?",
  "What budget, date and intended uses should we work to?",
].join("\n\n");

type Room = "collect" | "genesis" | "commissions";

export function ArcaneaMaison({
  children,
  room,
}: {
  children: ReactNode;
  room: Room;
}) {
  return (
    <section className={styles.maison} aria-label="Arcanea Editions">
      <header className={styles.mast}>
        <Link className={styles.wordmark} href="/collect">
          Arcanea Editions
        </Link>
        <nav className={styles.nav} aria-label="Arcanea Editions">
          <Link
            href="/collect"
            aria-current={room === "collect" ? "page" : undefined}
          >
            Collection
          </Link>
          <Link
            href="/collect/genesis"
            aria-current={room === "genesis" ? "page" : undefined}
          >
            Genesis
          </Link>
          <Link
            href="/commissions"
            aria-current={room === "commissions" ? "page" : undefined}
          >
            Commissions
          </Link>
        </nav>
      </header>
      {children}
      <footer className={styles.foot}>
        <span>Arcanea Editions · Private preview</span>
        <Link href="/shop">Visit the Arcanea edition shop</Link>
      </footer>
    </section>
  );
}

function Screen({ linked = true }: { linked?: boolean }) {
  const image = (
    <Image
      src={plateSource(museumPlate)}
      unoptimized={localPlateCopiesEnabled()}
      width={900}
      height={420}
      alt="Six gilded panels with phoenixes, paulownia trees and bamboo."
      sizes="(max-width: 800px) 94vw, 57vw"
      loading="eager"
      fetchPriority="high"
    />
  );
  return (
    <figure className={styles.heroArt}>
      {linked ? <Link href="/collect/phoenix-screen">{image}</Link> : image}
      <figcaption className={styles.caption}>
        <span>
          <i>Phoenixes and Paulownia</i> · Japan, late 1500s
        </span>
        <a href={museum}>Cleveland Museum of Art · CC0</a>
      </figcaption>
    </figure>
  );
}

export function CollectRoom() {
  return (
    <ArcaneaMaison room="collect">
      <header className={`${styles.hero} ${styles.heroSplit}`}>
        <div>
          <p className={styles.kicker}>Private preview</p>
          <h1>
            Art for worlds <em>worth keeping.</em>
          </h1>
          <p className={styles.lede}>
            A first look at Arcanea’s illustrated archive and the private
            commissions it makes possible.
          </p>
          <div className={styles.actions}>
            <Link className={styles.button} href="/collect/genesis">
              Enter Genesis <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.textLink} href="/commissions">
              Explore a commission
            </Link>
          </div>
        </div>
        <Screen />
      </header>
      <section
        className={`${styles.section} ${styles.split}`}
        aria-label="Ways to explore"
      >
        <div>
          <p className={styles.kicker}>Archive</p>
          <h2>Genesis.</h2>
          <p>
            Ten Arcanea field plates and a separately credited museum study.
            Each work opens with a curatorial note and a source record.
          </p>
        </div>
        <div>
          <p className={styles.kicker}>Studio</p>
          <h2>A world of your own.</h2>
          <p>
            Start with a story, a place or a question. Review a sample direction
            and describe what you want the world to become.
          </p>
        </div>
      </section>
    </ArcaneaMaison>
  );
}

export function GenesisRoom() {
  return (
    <ArcaneaMaison room="genesis">
      <header className={`${styles.hero} ${styles.heroSplit}`}>
        <div>
          <p className={styles.kicker}>Arcanea archive</p>
          <h1>Genesis.</h1>
          <p className={styles.lede}>
            Look closely at the objects and creatures a world uses to tell its
            stories. Start with a gilded screen or open one of ten Arcanea field
            plates.
          </p>
          <div className={styles.actions}>
            <a className={styles.button} href="#field-plates">
              Explore the field plates <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <Screen />
      </header>
      <section
        className={styles.section}
        id="field-plates"
        aria-labelledby="plates-heading"
      >
        <p className={styles.kicker}>Arcanea Bestiary · Volume I</p>
        <h2 id="plates-heading">Mythic Commons</h2>
        <p>
          Public editorial renditions from the Arcanea archive. Open a plate for
          its title, notes and provenance.
        </p>
        <div className={styles.grid}>
          {plates.map((plate) => (
            <Link
              className={styles.work}
              key={plate.assetId}
              href={`/collect/${plate.slug}`}
            >
              <figure>
                <PlateImage plate={plate} decorative />
              </figure>
              <span>Field plate {plate.plate}</span>
              <strong>{plate.name}</strong>
            </Link>
          ))}
        </div>
      </section>
      <section
        className={`${styles.section} ${styles.split}`}
        aria-labelledby="edition-heading"
      >
        <div>
          <p className={styles.kicker}>Founding edition proposal · €490</p>
          <h2 id="edition-heading">Genesis Collector Edition</h2>
          <p>
            A proposed set of Arcanea art files with a companion folio and a
            provenance record for each work. Exact works and personal display
            terms are under review.
          </p>
        </div>
        <div className={styles.note}>
          <p>
            The Phoenix Screen is a separate editorial study of an open-access
            museum work. It shows the reading experience behind a folio.
          </p>
          <div className={styles.actions}>
            <Link className={styles.textLink} href="/collect/phoenix-screen">
              Read the screen study
            </Link>
          </div>
        </div>
      </section>
    </ArcaneaMaison>
  );
}

export function PhoenixScreenRoom() {
  return (
    <ArcaneaMaison room="genesis">
      <header className={`${styles.hero} ${styles.heroSplit}`}>
        <div>
          <p className={styles.kicker}>Genesis Studies · Museum reference</p>
          <h1>
            The Phoenix <em>Screen.</em>
          </h1>
          <p className={styles.lede}>
            A close reading of a late-sixteenth-century folding screen
            attributed to Tosa Mitsuyoshi.
          </p>
          <div className={styles.actions}>
            <a className={styles.button} href={museum}>
              Read the museum record ↗
            </a>
          </div>
        </div>
        <Screen linked={false} />
      </header>
      <section
        className={`${styles.section} ${styles.split}`}
        aria-labelledby="screen-reading"
      >
        <div>
          <h2 id="screen-reading">Read across the folds.</h2>
          <p>
            Trace the long tails, then follow the plants between the panels.
            Notice how the gold makes the distance between two figures feel
            deliberate.
          </p>
        </div>
        <div className={styles.note}>
          <p>
            The Cleveland Museum of Art releases its source image under CC0. The
            Arcanea study folio has separate editorial terms.
          </p>
          <ul className={styles.facts}>
            <li>Six-page reading folio and offline HTML</li>
            <li>Full screen and two detail compositions</li>
            <li>Writing exercise, rights sheet and provenance record</li>
          </ul>
        </div>
      </section>
    </ArcaneaMaison>
  );
}

export function CommissionRoom() {
  const mail = `mailto:${enquiryAddress}?subject=${encodeURIComponent("Arcanea private world commission")}&body=${encodeURIComponent(commissionBrief)}`;
  return (
    <ArcaneaMaison room="commissions">
      <header className={`${styles.hero} ${styles.heroSplit}`}>
        <div>
          <p className={styles.kicker}>Arcanea studio · Private commission</p>
          <h1>
            Give a world <em>its first form.</em>
          </h1>
          <p className={styles.lede}>
            Commission an original setting with a world brief, a visual
            direction and a first scene your team can develop.
          </p>
          <div className={styles.actions}>
            <a className={styles.button} href="#brief">
              Prepare an enquiry <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <Screen />
      </header>
      <section
        className={`${styles.section} ${styles.split}`}
        aria-labelledby="commission-demo"
      >
        <div>
          <p className={styles.kicker}>Worked example</p>
          <h2 id="commission-demo">One place. One rule.</h2>
          <p>
            A coastal archive opens only during the hour when the tide reveals
            its steps. The first scene follows a caretaker who must choose which
            letter to save as the water returns. The production brief can carry
            that rule into the setting, visual references and scene continuity.
          </p>
          <div className={styles.actions}>
            <Link className={styles.textLink} href="/shop/sample">
              Open the editable World Starter sample
            </Link>
          </div>
        </div>
        <div className={styles.note}>
          <p className={styles.kicker}>Proposed from €5,000</p>
          <p>
            Initial scope: one setting, two key images, one scene and two review
            rounds. Timing and usage rights are agreed in the written proposal.
          </p>
          <p>
            The screen above is a museum reference for visual reading. The
            sample shows the shape of an original creative brief.
          </p>
        </div>
      </section>
      <section
        className={`${styles.section} ${styles.split}`}
        id="brief"
        aria-labelledby="commission-brief"
      >
        <div>
          <h2 id="commission-brief">Tell us what you want to make.</h2>
          <p>
            Share the intended audience, medium, timing, budget and what you’ll
            need permission to do with the work.
          </p>
        </div>
        <div>
          <p>
            The enquiry opens a draft in your email app. Send it when you’re
            ready.
          </p>
          <div className={styles.actions}>
            <a className={styles.button} href={mail}>
              Open the enquiry draft ↗
            </a>
            <a className={styles.textLink} href={`mailto:${enquiryAddress}`}>
              {enquiryAddress}
            </a>
          </div>
        </div>
      </section>
    </ArcaneaMaison>
  );
}
