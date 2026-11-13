import type { Metadata } from "next";
import { RenaissanceClient } from "./renaissance-client";
import "./renaissance.css";

export const metadata: Metadata = {
  title: "Arcanea Creative Renaissance — Council Constitution, Narrative Bible & 3 Pilots",
  description:
    "Interactive command hub for the Arcanea Creative Renaissance: Four-Altitude Narrative Bible, Design Constitution v3.1.0, Three Cinematic Pilot Packages, Independent Critic Gate, and Gate G5 Founding Cohort.",
  alternates: { canonical: "/renaissance" },
};

export default function RenaissancePage() {
  return <RenaissanceClient />;
}
