/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-function-type, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, react-hooks/rules-of-hooks, react-hooks/purity, react-hooks/refs, react-hooks/static-components, react-hooks/immutability, react-hooks/preserve-manual-memoization, jsx-a11y/alt-text, @next/next/no-img-element, @next/next/no-html-link-for-pages, react/no-unescaped-entities */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import navLogo from "@/assets/brand/arcanea-mark.jpg";
import { track } from "@vercel/analytics";
import {
  PhPaperPlane,
  PhPencil,
  PhFeather,
  PhCode,
  PhPaintBrush,
} from "@/lib/phosphor-icons";

// ---------------------------------------------------------------------------
// Starter cards — the 4 creation modes
// ---------------------------------------------------------------------------

const STARTER_CARDS = [
  {
    icon: PhPencil,
    label: "Map world graph",
    prompt:
      "Synthesize a persistent world graph: core premise, faction hierarchy, relational physics, and sovereign constraints.",
    href: "/worlds/create",
  },
  {
    icon: PhFeather,
    label: "Draft scene sequence",
    prompt:
      "Draft an opening scene sequence with strict character tension, physical blocking, and calibrated dialogue.",
  },
  {
    icon: PhPaintBrush,
    label: "Design visual direction",
    prompt:
      "Define architectural visual tokens, camera focal lengths, lighting models, and negative prompts for generative asset pipelines.",
  },
  {
    icon: PhCode,
    label: "Orchestrate agent team",
    prompt:
      "Configure an autonomous 4-agent swarm: world scout, continuity auditor, narrative architect, and asset compiler.",
  },
];

// ---------------------------------------------------------------------------
// Component — Direct-to-chat, no preview intermediary
// ---------------------------------------------------------------------------

export function HeroChatBox() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const goToChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Next.js router for instant SPA navigation (no full page reload)
    router.push(`/chat?prompt=${encodeURIComponent(trimmed)}`);
  };

  // Typed prompts only. The event carries no properties: the prompt text is
  // the creator's and never leaves the page as analytics.
  const submit = () => {
    if (!message.trim()) return;
    track("home_hero_submit");
    goToChat(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const hasText = message.trim().length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Input container — Clinical AI Lab Standard */}
      <div
        className={`relative rounded-2xl border transition-all duration-200 bg-[#0d0e12]/95 backdrop-blur-xl ${
          isFocused
            ? "border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.12),0_8px_32px_rgba(0,0,0,0.5)]"
            : "border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-white/[0.14]"
        }`}
      >
        <div className="relative flex items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Initialize world graph, character architecture, or agent workflow…"
            aria-label="Describe what you want to create"
            name="prompt"
            autoComplete="off"
            rows={1}
            className="flex-1 px-5 py-4 bg-transparent text-white/95 placeholder-white/40 resize-none focus:outline-none font-sans text-[15px] leading-relaxed"
            style={{ minHeight: "56px", maxHeight: "120px" }}
          />

          {/* Model info & Send action */}
          <div className="flex items-center gap-2 p-2.5 pr-3">
            <span className="hidden md:inline-flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-white/40">
              <span>gemini-4-argon</span>
              <span>·</span>
              <span>2M</span>
            </span>

            <button
              type="button"
              onClick={submit}
              disabled={!hasText}
              className={`inline-flex h-10 items-center justify-center gap-1.5 px-3.5 rounded-xl font-sans font-medium text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                hasText
                  ? "bg-emerald-400 text-[#090a0c] hover:bg-emerald-300 hover:shadow-[0_0_16px_rgba(52,211,153,0.4)] active:scale-95"
                  : "bg-white/[0.04] text-white/30 cursor-default"
              }`}
              aria-label={
                hasText ? "Initialize in chat" : "Enter prompt to initialize"
              }
            >
              <span>Initialize</span>
              <span className="font-mono text-[10px] opacity-60">⌘↵</span>
            </button>
          </div>
        </div>
      </div>

      {/* Starter cards — 4 creation modes */}
      <div className="mt-5 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2">
        {STARTER_CARDS.map((card) => {
          const Icon = card.icon;
          const handleClick = () => {
            track("home_hero_chip", { chip: card.label });
            if ("href" in card && card.href) {
              const sep = card.href.includes("?") ? "&" : "?";
              router.push(
                `${card.href}${sep}prompt=${encodeURIComponent(card.prompt)}`,
              );
            } else {
              goToChat(card.prompt);
            }
          };
          return (
            <button
              key={card.label}
              type="button"
              onClick={handleClick}
              className="group flex min-h-[44px] items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px] sm:text-[13px] text-white/70 hover:text-white/90 bg-white/[0.04] hover:bg-gradient-to-r hover:from-[var(--arc-brand-atlantean-teal)]/[0.06] hover:to-transparent border border-white/[0.08] hover:border-[var(--arc-brand-atlantean-teal)]/20 hover:shadow-[0_0_16px_color-mix(in_srgb,var(--arc-brand-atlantean-teal)_6%,transparent)] active:scale-[0.98] transition-[color,background-color,border-color,box-shadow,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--arc-brand-atlantean-teal)]"
              aria-label={`${card.label}: ${card.prompt}`}
            >
              <Icon
                aria-hidden="true"
                className="w-3.5 h-3.5 text-white/55 group-hover:text-[var(--arc-brand-atlantean-teal)] transition-colors"
              />
              {card.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
