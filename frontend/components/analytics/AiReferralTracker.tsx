"use client";

import { useEffect } from "react";

/**
 * Measures GEO/AEO traffic: visits arriving from AI assistants (ChatGPT,
 * Perplexity, Gemini, Copilot, Claude, …). GA4 folds these into "Referral" or
 * "Direct" and gives no AI breakdown, so we fire a dedicated `ai_referral`
 * event (with `ai_source`) the user can read in GA4 Reports → Events, or turn
 * into a custom channel group. Detects the AI host from the document referrer
 * or a `utm_source` tag; fires once per source per session.
 */
const AI_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "openai.com",
  "perplexity.ai",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "edgeservices.bing.com",
  "claude.ai",
  "you.com",
  "poe.com",
  "meta.ai",
  "chat.mistral.ai",
  "phind.com",
];

function matchAiSource(): string | null {
  try {
    const utm = new URLSearchParams(window.location.search)
      .get("utm_source")
      ?.toLowerCase();
    if (utm) {
      const hit = AI_HOSTS.find((h) => utm === h || utm.includes(h));
      if (hit) return hit;
    }
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.toLowerCase();
      const hit = AI_HOSTS.find((h) => host === h || host.endsWith(`.${h}`));
      if (hit) return hit;
    }
  } catch {
    // malformed referrer/URL — ignore
  }
  return null;
}

export default function AiReferralTracker() {
  useEffect(() => {
    const source = matchAiSource();
    if (!source) return;

    const key = `ai_ref:${source}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", "ai_referral", {
      ai_source: source,
      page_location: window.location.href,
    });
  }, []);

  return null;
}
