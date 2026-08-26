"use client";

import { useEffect, useRef } from "react";
import { outbidTweet, tweetIntentUrl } from "@/lib/tweets";
import type { PlotRecord } from "@/lib/types";
import { toastManager } from "@/components/ui/toast";

const OWNED_KEY = "ownmars-owned";

export function rememberOwnership(slug: string, email: string) {
  const current = readOwned();
  current[slug] = email;
  localStorage.setItem(OWNED_KEY, JSON.stringify(current));
}

function readOwned(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(OWNED_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function LiveToasts({
  plots,
  ignoreSlug = null,
}: {
  plots: PlotRecord[];
  ignoreSlug?: string | null;
}) {
  const prev = useRef(new Map(plots.map((p) => [p.slug, p])));

  useEffect(() => {
    const owned = readOwned();
    for (const plot of plots) {
      const before = prev.current.get(plot.slug);
      if (!before) continue;
      if (plot.slug === ignoreSlug) continue;
      if (plot.ownerName && plot.ownerName !== before.ownerName) {
        const stolen = Boolean(
          before.ownerName && owned[plot.slug] && owned[plot.slug] !== (plot.ownerEmail || ""),
        );
        toastManager.add({
          title: stolen ? "Your plot was taken" : `${plot.name} claimed`,
          description: stolen
            ? `${plot.ownerName} took ${plot.name}. Reclaim it.`
            : `${plot.ownerName} now holds ${plot.name}`,
          type: stolen ? "error" : "success",
          timeout: 7000,
          actionProps: stolen
            ? {
                children: "Post tweet",
                onClick: () => {
                  window.open(tweetIntentUrl(outbidTweet()), "_blank", "noopener,noreferrer");
                },
              }
            : undefined,
        });
        if (stolen) delete owned[plot.slug];
      }
    }
    localStorage.setItem(OWNED_KEY, JSON.stringify(owned));
    prev.current = new Map(plots.map((p) => [p.slug, p]));
  }, [plots, ignoreSlug]);

  return null;
}
