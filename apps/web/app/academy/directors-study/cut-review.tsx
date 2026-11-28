"use client";

import Image from "next/image";
import { useState } from "react";
import { portrait } from "./portrait";
import styles from "./study.module.css";

const takes = [
  {
    id: "A",
    effect: styles.mirror,
    alt: "A closer frame moves the amber cheek to screen right.",
    verdict: "The axis flips.",
    reason:
      "The teardrop jumps to screen right. In a continuous gesture, that reversal makes Elara appear to turn between frames.",
  },
  {
    id: "B",
    effect: styles.close,
    alt: "A closer frame retains the amber cheek on screen left and blue light on screen right.",
    verdict: "The cut holds.",
    reason:
      "The teardrop stays on screen left. Amber and blue retain their positions, so the change in scale reads as a closer look at the same instant.",
  },
  {
    id: "C",
    effect: styles.mono,
    alt: "The teardrop stays on screen left in a monochrome close-up.",
    verdict: "The cheek holds. The light drops out.",
    reason:
      "The mark stays on screen left, but the amber–blue separation vanishes. Without a motivated lighting change, the close-up reads as a different moment.",
  },
];

const beats = [
  {
    label: "Before contact · anticipation",
    direction:
      "Cut two frames before the fingertips meet the filament. Hold the close-up for one second so the contact resolves inside the shot.",
  },
  {
    label: "After contact · recognition",
    direction:
      "Let the fingertips meet the filament in the opening shot. Cut four frames after contact, then hold the close-up for two seconds as the gesture settles.",
  },
];

function Frame({
  label,
  caption,
  alt,
  effect,
}: {
  label: string;
  caption: string;
  alt: string;
  effect?: string;
}) {
  return (
    <figure>
      <div className={styles.frame}>
        <Image
          src={portrait}
          alt={alt}
          fill
          sizes="(max-width: 700px) 50vw, 44vw"
          className={effect}
        />
        <span>{label}</span>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function CutReview() {
  const [take, setTake] = useState(takes[0]);
  const [checked, setChecked] = useState(false);
  const [beat, setBeat] = useState(beats[0]);
  const [exported, setExported] = useState(false);
  const matched = checked && take.id === "B";

  function exportBrief() {
    const brief = [
      "# The second shot",
      "Arcanea director’s study · Elara, Guardian of Starweave",
      "## Scene",
      "Elara draws a filament toward her fingertips. One continuous gesture, two shots.",
      "## Shot 01 — medium",
      "Establish the raised hand and web of light. Keep the teardrop on the amber cheek at screen left. Cool blue falls on screen right.",
      "## Shot 02 — close-up · Take B",
      "Push in on the face. Hold the camera axis, screen-left mark and amber–blue split.",
      "## Edit at 24 fps",
      beat.direction,
      "## Handoff check",
      "Inspect the side of the cheek mark, the amber–blue division and the phase of the hand gesture at the cut. Use the same character reference for both shots.",
      "Reference: https://arcanea.ai" + portrait,
      "Original educational storyboard exercise.",
    ].join("\n\n");
    const url = URL.createObjectURL(
      new Blob([brief], { type: "text/markdown;charset=utf-8" }),
    );
    const download = document.createElement("a");
    download.href = url;
    download.download = "Elara-Continuity-Shot-Brief.md";
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setExported(true);
  }

  return (
    <>
      <section className={styles.review} aria-labelledby="review-title">
        <h2 id="review-title">Which take holds the cut?</h2>
        <p>
          Track the dark teardrop on Elara’s amber cheek. Keep its screen
          position and the two-tone light.
        </p>
        <div className={styles.pair}>
          <Frame
            label="Shot 01 · Locked"
            caption="Reference frame"
            alt="Opening frame with the amber cheek and teardrop on screen left, blue light on screen right."
          />
          <Frame
            label={"Shot 02 · Take " + take.id}
            caption="Candidate frame"
            alt={take.alt}
            effect={take.effect}
          />
        </div>
        <div className={styles.controls}>
          <div className={styles.tabs} role="group" aria-label="Candidate take">
            {takes.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={take.id === option.id}
                onClick={() => {
                  setTake(option);
                  setChecked(false);
                  setExported(false);
                }}
              >
                Take {option.id}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.check}
            onClick={() => setChecked(true)}
          >
            Check this cut
          </button>
        </div>
        <div role="status">
          {checked && (
            <div className={styles.feedback}>
              <strong>{take.verdict}</strong>
              <p>{take.reason}</p>
            </div>
          )}
        </div>
      </section>
      <section className={styles.direction} aria-labelledby="direction-title">
        <div>
          <h2 id="direction-title">Direct the hold</h2>
          <p>
            Choose the beat that moves us closer. Export the reference, framing
            and timing as a brief for the next AI storyboard pass.
          </p>
        </div>
        <div>
          <label htmlFor="cut-point">When does the close-up land?</label>
          <select
            id="cut-point"
            value={beat.label}
            onChange={(event) => {
              setBeat(
                beats.find((option) => option.label === event.target.value) ??
                  beats[0],
              );
              setExported(false);
            }}
          >
            {beats.map((option) => (
              <option key={option.label}>{option.label}</option>
            ))}
          </select>
          <p>{beat.direction}</p>
          <button type="button" disabled={!matched} onClick={exportBrief}>
            Export shot brief
          </button>
          <span role="status">
            {exported
              ? "Shot brief exported."
              : matched
                ? "Ready for your editor."
                : "Match the cut to enable export."}
          </span>
        </div>
      </section>
    </>
  );
}
