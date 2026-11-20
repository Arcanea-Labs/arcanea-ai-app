"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  ARCANEA_DESIGN_CONSTITUTION_VERSION,
  SURFACE_MODES,
  GODBEAST_MORPHOLOGY_LOCKS,
  NARRATIVE_BIBLE_VERSION,
  FOUR_ALTITUDE_CAST_ARCHITECTURE,
  SPECTRUM_WEAVING_LEXICON,
  CINEMATIC_PILOTS,
  EDITORIAL_POD_SEATS,
  APPROVAL_PIPELINE_STAGES,
  runIndependentCriticalReview,
  GATE_G5_REVENUE_EXPERIMENT,
  SHOP_DEMAND_ROLES,
  SHOP_PRICE_BANDS,
  encodeShopWaitlistSource,
  type ShopDemandRole,
  type ShopPriceBand,
} from "@/lib/renaissance";
import { submitWaitlist } from "@/lib/waitlist/submit";

const CRITIC_PRESETS = [
  {
    id: "clean",
    label: "1. Clean Renaissance Scene (Pass)",
    title: "Registration Hall Three — The Blank Line",
    bodyText:
      "At the Great Confluence, Arion grounds the Foundation tremor into his own forearm while Mera Tidecrest watches the bronze ink-well settle. Clerk Sera Venn stamps CIVIC APPRENTICE as Emilia calibrates her Refracted Destello lens.",
    surfaceMode: "prism-realism" as const,
    producerSeatId: "theo-park",
    reviewerSeatId: "verity-sloane",
    hasRightsManifest: true,
    claimsLiveDeployment: false,
  },
  {
    id: "hz-leak",
    label: "2. Solfeggio Hz Leak + IP Contamination (Reject)",
    title: "Gate 8 Shift Luxin Test",
    bodyText:
      "Elara opens the Shift gate at 852 Hz while a super-violet luxin drafter risks halo-burn alongside Vesper, a Luminor intelligence entity.",
    surfaceMode: "prism-realism" as const,
    producerSeatId: "theo-park",
    reviewerSeatId: "verity-sloane",
    hasRightsManifest: false,
    claimsLiveDeployment: false,
  },
];

export function RenaissanceClient() {
  const [altitudeIndex, setAltitudeIndex] = useState(0);
  const [pilotIndex, setPilotIndex] = useState(0);
  const [shotIndex, setShotIndex] = useState(0);
  const [surfaceIndex, setSurfaceIndex] = useState(0);
  const [presetId, setPresetId] = useState("clean");

  // Waitlist state
  const [editionSlug, setEditionSlug] = useState("worldbuilder-production-edition");
  const [role, setRole] = useState<ShopDemandRole>("worldbuilder");
  const [priceBand, setPriceBand] = useState<ShopPriceBand>("eur99");
  const [email, setEmail] = useState("");
  const [waitlistState, setWaitlistState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);

  const activeAltitude = FOUR_ALTITUDE_CAST_ARCHITECTURE[altitudeIndex] ?? FOUR_ALTITUDE_CAST_ARCHITECTURE[0];
  const activePilot = CINEMATIC_PILOTS[pilotIndex] ?? CINEMATIC_PILOTS[0];
  const activeShot = activePilot.shots[shotIndex] ?? activePilot.shots[0];
  const activeSurface = SURFACE_MODES[surfaceIndex] ?? SURFACE_MODES[0];
  const activePreset = CRITIC_PRESETS.find((p) => p.id === presetId) ?? CRITIC_PRESETS[0];

  const criticResult = runIndependentCriticalReview({
    assetId: `test-${activePreset.id}`,
    title: activePreset.title,
    surfaceMode: activePreset.surfaceMode,
    bodyText: activePreset.bodyText,
    producerSeatId: activePreset.producerSeatId,
    reviewerSeatId: activePreset.reviewerSeatId,
    hasRightsManifest: activePreset.hasRightsManifest,
    claimsLiveDeployment: activePreset.claimsLiveDeployment,
    hasVerifiedDeploymentEvidence: false,
  });

  async function handleCohortSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWaitlistState("submitting");
    setWaitlistMsg(null);
    const source = encodeShopWaitlistSource(editionSlug, role, priceBand);
    const result = await submitWaitlist(email, source);
    if (result.ok) {
      setWaitlistState("done");
      setWaitlistMsg(result.message);
      setEmail("");
      return;
    }
    setWaitlistState("error");
    setWaitlistMsg(result.error);
  }

  return (
    <div className="arc-renaissance">
      <header className="ren-topline">
        <Link href="/" className="ren-wordmark">
          Arcanea <span>/ Creative Renaissance Council</span>
        </Link>
        <nav className="ren-nav" aria-label="Creative Renaissance navigation">
          <a href="#narrative-bible">Narrative Bible</a>
          <a href="#pilot-screening">3 Cinematic Pilots</a>
          <a href="#design-constitution">Design Constitution</a>
          <a href="#critic-gate">Independent Critic</a>
          <a href="#founding-cohort">Founding Cohort (Gate G5)</a>
          <Link href="/shop">Editions Shop</Link>
        </nav>
      </header>

      <section className="ren-hero">
        <div>
          <p className="ren-eyebrow">
            EXECUTIVE CREATIVE &amp; ENGINEERING COUNCIL · {ARCANEA_DESIGN_CONSTITUTION_VERSION}
          </p>
          <h1>
            A world people remember, return to, and <em>eventually help build.</em>
          </h1>
          <p className="ren-lead">
            Integrating the Mythology Architect, Celestial Art Director, Cultural Communications
            Director, and Starlight Production Engineer across 1.82M manuscript words, 428 curated
            visuals, 845 Suno tracks, and fail-closed production governance.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="#pilot-screening" className="shop-button">
              Inspect 3 Pilot Packages
            </a>
            <Link
              href="/shop/sample"
              className="shop-button"
              style={{
                background: "transparent",
                color: "var(--arc-text-primary, #f5f5f7)",
                borderColor: "rgba(255,255,255,0.2)",
              }}
            >
              Read Free World Starter
            </Link>
          </div>
        </div>

        <aside className="ren-ledger-panel" aria-label="Measured estate baseline">
          <div className="ren-ledger-row">
            <span>Manuscript Corpus</span>
            <span className="ren-mono-tag">[MEASURED] 1,821,000 words · 4 EPUBs</span>
          </div>
          <div className="ren-ledger-row">
            <span>Visual Archive &amp; Exhibitions</span>
            <span className="ren-mono-tag">[MEASURED] 428 curated plates · 4 exhibitions</span>
          </div>
          <div className="ren-ledger-row">
            <span>Sonic Catalog (Suno)</span>
            <span className="ren-mono-tag">[MEASURED] 845 tracks · 26,193 plays</span>
          </div>
          <div className="ren-ledger-row">
            <span>Production Compute Cap</span>
            <span className="ren-mono-tag ren-mono-tag-gold">[RULED] $0.13 / slice · $40/mo cap</span>
          </div>
          <div className="ren-ledger-row">
            <span>Commerce &amp; Rights Posture</span>
            <span className="ren-mono-tag ren-mono-tag-gold">
              [RULED] Gate G5 Waitlist · RM001–RM008
            </span>
          </div>
        </aside>
      </section>

      {/* SECTION 1: FOUR-ALTITUDE NARRATIVE BIBLE */}
      <section id="narrative-bible" className="ren-section">
        <div className="ren-section-header">
          <div>
            <p className="ren-eyebrow">WORKSTREAM I · MYTHOLOGY ARCHITECT ({NARRATIVE_BIBLE_VERSION})</p>
            <h2>Four-Altitude Narrative Bible &amp; Native Spectrum Lexicon</h2>
          </div>
          <span className="ren-mono-tag">CANON_LOCKED.md Compliant · RM008 Quarantined</span>
        </div>

        <div className="ren-tabs" role="tablist" aria-label="Narrative Altitudes">
          {FOUR_ALTITUDE_CAST_ARCHITECTURE.map((layer, idx) => (
            <button
              key={layer.altitude}
              type="button"
              role="tab"
              aria-selected={altitudeIndex === idx}
              className={`ren-tab ${altitudeIndex === idx ? "is-active" : ""}`}
              onClick={() => setAltitudeIndex(idx)}
            >
              Altitude {idx + 1}: {layer.title.split("(")[0].trim()}
            </button>
          ))}
        </div>

        <div className="ren-grid-2">
          <div className="ren-card">
            <span className="ren-mono-tag">{activeAltitude.provenance}</span>
            <h3 style={{ marginTop: "12px" }}>{activeAltitude.title}</h3>
            <p style={{ marginBottom: "16px" }}>{activeAltitude.dramaticFunction}</p>
            <p
              style={{
                padding: "12px 14px",
                background: "rgba(0,188,212,0.07)",
                borderRadius: "8px",
                border: "1px solid rgba(0,188,212,0.2)",
                fontSize: "13px",
              }}
            >
              <strong>Cross-Altitude Bridge:</strong> {activeAltitude.canonicalBridgeRule}
            </p>
          </div>

          <div className="ren-card">
            <h3>Canonical Figures at This Altitude</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              {activeAltitude.primaryCast.map((char) => (
                <div
                  key={char.id}
                  style={{
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <strong style={{ fontSize: "14px" }}>{char.canonicalName}</strong>
                    <span className="ren-mono-tag" style={{ fontSize: "11px" }}>
                      {char.gateOrElement}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", marginTop: "4px" }}>{char.dramaticWoundAndChoice}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ren-card" style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
            <h3>Canonical Native Arcanean Spectrum Lexicon (RM008 Quarantine)</h3>
            <span className="ren-mono-tag ren-mono-tag-gold">
              Replaces comparative Lightbringer terms in PRISM_LUXIN_SYSTEM.md
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="ren-table">
              <thead>
                <tr>
                  <th>Quarantined Term ([BLOCKED])</th>
                  <th>Canonical Arcanean Term ([RULED])</th>
                  <th>Gate Resonance</th>
                  <th>Physical &amp; Dramatic Behavior</th>
                </tr>
              </thead>
              <tbody>
                {SPECTRUM_WEAVING_LEXICON.map((entry) => (
                  <tr key={entry.arcaneanTerm}>
                    <td style={{ fontFamily: "var(--arc-font-mono, monospace)", color: "#ff8a80" }}>
                      {entry.quarantinedTerm}
                    </td>
                    <td>
                      <strong>{entry.arcaneanTerm}</strong>
                    </td>
                    <td>{entry.gateResonance}</td>
                    <td>{entry.physicalBehavior}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: THREE CINEMATIC PILOT PACKAGES */}
      <section id="pilot-screening" className="ren-section">
        <div className="ren-section-header">
          <div>
            <p className="ren-eyebrow">CINEMATIC PILOT PACKAGES · REMOTION &amp; STUDIO PIPELINE</p>
            <h2>Three Production-Ready Pilot Specifications</h2>
          </div>
          <span className="ren-mono-tag ren-mono-tag-gold">
            release_state: &quot;script&quot; (Fail-Closed Until Human Render Gate)
          </span>
        </div>

        <div className="ren-tabs" role="tablist" aria-label="Cinematic Pilots">
          {CINEMATIC_PILOTS.map((pilot, idx) => (
            <button
              key={pilot.id}
              type="button"
              role="tab"
              aria-selected={pilotIndex === idx}
              className={`ren-tab ${pilotIndex === idx ? "is-active" : ""}`}
              onClick={() => {
                setPilotIndex(idx);
                setShotIndex(0);
              }}
            >
              Pilot 0{idx + 1}: {pilot.title} ({pilot.durationSeconds}s · {pilot.surfaceMode})
            </button>
          ))}
        </div>

        <div className="ren-grid-2">
          <div>
            <div className="ren-stage-frame" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
                <span className="ren-mono-tag">
                  SHOT {activeShot.shotId} · {activeShot.durationSeconds}s · {activeShot.cameraAndLens}
                </span>
                <span className="ren-mono-tag ren-mono-tag-gold">
                  Surface: {activePilot.surfaceMode}
                </span>
              </div>
              <h3 style={{ fontSize: "20px", margin: "0 0 10px" }}>
                {activePilot.title} — Shot {shotIndex + 1} of {activePilot.shots.length}
              </h3>
              <p style={{ fontSize: "14px", color: "#d7deec", lineHeight: 1.65, marginBottom: "16px" }}>
                {activeShot.visualAction}
              </p>
              <blockquote
                style={{
                  margin: "0 0 16px",
                  padding: "14px 16px",
                  background: "rgba(255,215,0,0.07)",
                  borderLeft: "2px solid #ffd700",
                  borderRadius: "6px",
                  fontFamily: "var(--arc-font-editorial, Georgia, serif)",
                  fontStyle: "italic",
                  fontSize: "18px",
                  color: "#f5f5f7",
                }}
              >
                {activeShot.dialogueOrCaption}
              </blockquote>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#a3adc2" }}>
                <span>
                  <strong>Lighting &amp; Color:</strong> {activeShot.lightingAndColorNote}
                </span>
                <span>
                  <strong>Sound Cue:</strong> {activeShot.soundCue}
                </span>
              </div>
            </div>

            <div className="ren-shot-strip" role="group" aria-label="Pilot storyboard shots">
              {activePilot.shots.map((s, idx) => (
                <button
                  key={s.shotId}
                  type="button"
                  className={`ren-shot-btn ${shotIndex === idx ? "is-active" : ""}`}
                  onClick={() => setShotIndex(idx)}
                >
                  <div style={{ fontFamily: "var(--arc-font-mono, monospace)", fontWeight: 600 }}>
                    {s.shotId} ({s.durationSeconds}s)
                  </div>
                  <div style={{ marginTop: "4px", opacity: 0.85 }}>
                    {s.cameraAndLens.split("·")[0]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="ren-card">
            <span className="ren-mono-tag">{activePilot.id}</span>
            <h3 style={{ marginTop: "12px" }}>{activePilot.subtitle}</h3>
            <p style={{ marginBottom: "14px" }}>{activePilot.logline}</p>
            <div className="ren-ledger-row">
              <span>Emotional Core</span>
              <span style={{ textAlign: "right", maxWidth: "60%" }}>{activePilot.emotionalCore}</span>
            </div>
            <div className="ren-ledger-row">
              <span>Suno Score Direction</span>
              <span style={{ textAlign: "right", maxWidth: "60%" }}>
                {activePilot.sunoScoreBrief.styleVoice} ({activePilot.sunoScoreBrief.tempoBpm} BPM ·{" "}
                {activePilot.sunoScoreBrief.keySignature})
              </span>
            </div>
            <div className="ren-ledger-row">
              <span>Reference Track Pairing</span>
              <span className="ren-mono-tag">{activePilot.sunoScoreBrief.referenceTrackTitle}</span>
            </div>
            <div className="ren-ledger-row">
              <span>Compute Cost Envelope</span>
              <span className="ren-mono-tag ren-mono-tag-gold">
                ${activePilot.estimatedCostUsd.storyboardSlice.toFixed(2)} slice / $
                {activePilot.estimatedCostUsd.fullRenderEstimate.toFixed(2)} full render
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: DESIGN CONSTITUTION & GODBEAST MORPHOLOGY */}
      <section id="design-constitution" className="ren-section">
        <div className="ren-section-header">
          <div>
            <p className="ren-eyebrow">WORKSTREAM II · CELESTIAL ART DIRECTOR</p>
            <h2>Design Constitution ({ARCANEA_DESIGN_CONSTITUTION_VERSION}) &amp; Godbeast Locks</h2>
          </div>
          <span className="ren-mono-tag">8 Morphology Locked · 2 Canon Contradiction Blocked</span>
        </div>

        <div className="ren-tabs" role="tablist" aria-label="Surface Modes">
          {SURFACE_MODES.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={surfaceIndex === idx}
              className={`ren-tab ${surfaceIndex === idx ? "is-active" : ""}`}
              onClick={() => setSurfaceIndex(idx)}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="ren-card" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <h3>{activeSurface.name}</h3>
            <span className="ren-mono-tag">Mode ID: {activeSurface.id}</span>
          </div>
          <p style={{ marginTop: "8px", marginBottom: "14px" }}>{activeSurface.lightingRule}</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {Object.entries(activeSurface.palette).map(([key, hex]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: "12px",
                  fontFamily: "var(--arc-font-mono, monospace)",
                }}
              >
                <span
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "3px",
                    background: hex,
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
                <span>
                  {key}: {hex}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ren-grid-3">
          {GODBEAST_MORPHOLOGY_LOCKS.map((gb) => (
            <div key={gb.gateNumber} className="ren-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                <span className="ren-mono-tag">
                  Gate {gb.gateNumber} · {gb.gateName}
                </span>
                <span
                  className={`ren-mono-tag ${
                    gb.productionStatus === "CANON_CONTRADICTION_BLOCK" ? "ren-mono-tag-gold" : ""
                  }`}
                >
                  {gb.productionStatus}
                </span>
              </div>
              <h3>
                {gb.godbeast} <span style={{ fontWeight: 400, color: "#a3adc2" }}>({gb.guardian})</span>
              </h3>
              <p style={{ marginTop: "6px", fontSize: "13px" }}>{gb.lockedMorphology}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: INDEPENDENT CRITIC SANDBOX */}
      <section id="critic-gate" className="ren-section">
        <div className="ren-section-header">
          <div>
            <p className="ren-eyebrow">WORKSTREAM III &amp; IV · INDEPENDENT CRITICAL REVIEW</p>
            <h2>Live Critic Sandbox (verity-sloane · Maker != Checker)</h2>
          </div>
          <span className="ren-mono-tag">Pass Threshold &gt;= 85/100 · Auto-Approve Disabled</span>
        </div>

        <div className="ren-tabs">
          {CRITIC_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`ren-tab ${presetId === preset.id ? "is-active" : ""}`}
              onClick={() => setPresetId(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="ren-grid-2">
          <div className="ren-card">
            <h3>Inspected Candidate Payload</h3>
            <p style={{ marginTop: "8px", fontFamily: "var(--arc-font-mono, monospace)", fontSize: "12px" }}>
              Producer: {activePreset.producerSeatId} · Independent Critic: {activePreset.reviewerSeatId}
            </p>
            <p
              style={{
                marginTop: "14px",
                padding: "14px",
                borderRadius: "8px",
                background: "#080b11",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f5f5f7",
              }}
            >
              {activePreset.bodyText}
            </p>
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ fontSize: "13px", marginBottom: "8px", color: "#a3adc2" }}>
                7-Stage Pipeline &amp; Editorial Pod ({EDITORIAL_POD_SEATS.length} Seats)
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {APPROVAL_PIPELINE_STAGES.map((st) => (
                  <span key={st.stageId} className="ren-mono-tag" style={{ fontSize: "11px" }}>
                    {st.order}. {st.name} ({st.ownerSeatId})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="ren-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Critic Verdict: {criticResult.verdict.toUpperCase()}</h3>
              <span className="ren-mono-tag ren-mono-tag-gold">
                Score: {criticResult.overallScore} / 100
              </span>
            </div>
            {criticResult.blockers.length === 0 ? (
              <p style={{ marginTop: "12px", color: "#7fffd4" }}>
                Zero blockers detected. Ready for Stage 6 Human HMAC Approval (human:frank).
              </p>
            ) : (
              <ul style={{ marginTop: "12px", paddingLeft: "18px", color: "#ff8a80", fontSize: "13px" }}>
                {criticResult.blockers.map((b) => (
                  <li key={b} style={{ marginBottom: "6px" }}>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 5: GATE G5 FOUNDING COHORT DEMAND CAPTURE */}
      <section id="founding-cohort" className="ren-section" style={{ borderBottom: "none" }}>
        <div className="ren-section-header">
          <div>
            <p className="ren-eyebrow">REVENUE EXPERIMENT · {GATE_G5_REVENUE_EXPERIMENT.experimentId}</p>
            <h2>Gate G5 Founding Cohort Demand Capture</h2>
          </div>
          <span className="ren-mono-tag ren-mono-tag-gold">
            priceState: &quot;proposed&quot; · Fail-Closed Pre-Launch
          </span>
        </div>

        <div className="ren-grid-2">
          <div className="ren-card">
            <h3>{GATE_G5_REVENUE_EXPERIMENT.title}</h3>
            <p style={{ marginTop: "8px", marginBottom: "16px" }}>
              {GATE_G5_REVENUE_EXPERIMENT.hypothesis}
            </p>
            <ul style={{ paddingLeft: "18px", fontSize: "13px", color: "#a3adc2", lineHeight: 1.65 }}>
              {GATE_G5_REVENUE_EXPERIMENT.foundingCohortBenefits.map((benefit) => (
                <li key={benefit} style={{ marginBottom: "6px" }}>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="ren-card">
            <h3>Record Founding Cohort Signal</h3>
            {waitlistState === "done" ? (
              <p style={{ marginTop: "12px", color: "#7fffd4" }} role="status">
                {waitlistMsg ?? "Your Founding Cohort signal is recorded."}
              </p>
            ) : (
              <form
                onSubmit={handleCohortSubmit}
                style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}
              >
                <label style={{ fontSize: "13px" }}>
                  Target Edition
                  <select
                    value={editionSlug}
                    onChange={(e) => setEditionSlug(e.target.value)}
                    disabled={waitlistState === "submitting"}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#080b11",
                      color: "#f5f5f7",
                      border: "1px solid rgba(255,255,255,0.16)",
                    }}
                  >
                    {GATE_G5_REVENUE_EXPERIMENT.editionsUnderTest.map((ed) => (
                      <option key={ed.slug} value={ed.slug}>
                        {ed.title} (proposed €{ed.proposedPriceEur})
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: "13px" }}>
                  Your Primary Craft Role
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as ShopDemandRole)}
                    disabled={waitlistState === "submitting"}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#080b11",
                      color: "#f5f5f7",
                      border: "1px solid rgba(255,255,255,0.16)",
                    }}
                  >
                    {SHOP_DEMAND_ROLES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: "13px" }}>
                  Fair One-Time Price Band
                  <select
                    value={priceBand}
                    onChange={(e) => setPriceBand(e.target.value as ShopPriceBand)}
                    disabled={waitlistState === "submitting"}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#080b11",
                      color: "#f5f5f7",
                      border: "1px solid rgba(255,255,255,0.16)",
                    }}
                  >
                    {SHOP_PRICE_BANDS.map((band) => (
                      <option key={band.id} value={band.id}>
                        {band.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: "13px" }}>
                  Email for Release Notice
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    disabled={waitlistState === "submitting"}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#080b11",
                      color: "#f5f5f7",
                      border: "1px solid rgba(255,255,255,0.16)",
                    }}
                  />
                </label>

                <button
                  type="submit"
                  className="shop-button"
                  disabled={waitlistState === "submitting"}
                >
                  {waitlistState === "submitting"
                    ? "Recording..."
                    : "Join Founding Cohort Waitlist"}
                </button>
                {waitlistState === "error" && waitlistMsg && (
                  <p style={{ color: "#ff8a80", fontSize: "13px" }} role="alert">
                    {waitlistMsg}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
