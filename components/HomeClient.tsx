"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { PlotRecord } from "@/lib/types";
import { ClaimDrawer } from "./ClaimDrawer";
import { SuccessModal } from "./SuccessModal";
import { LiveToasts, rememberOwnership } from "./LiveToasts";
import { StatsPill } from "./StatsPill";
import { Badge } from "@/components/ui/badge";

const MarsGlobe = dynamic(() => import("./MarsGlobe").then((m) => m.MarsGlobe), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-0 w-full animate-pulse rounded-3xl border border-white/10 bg-[#090a0f]" />
  ),
});

type Payments = { paddle: boolean; cryptomus: boolean; devSimulate: boolean };

type Props = {
  initialPlots: PlotRecord[];
  payments: Payments;
  supabaseEnabled: boolean;
};

export function HomeClient({ initialPlots, payments, supabaseEnabled }: Props) {
  const [plots, setPlots] = useState(initialPlots);
  const [selected, setSelected] = useState<string | null>(null);
  const [won, setWon] = useState<PlotRecord | null>(null);

  const selectedPlot = useMemo(
    () => plots.find((p) => p.slug === selected) ?? null,
    [plots, selected]
  );

  useEffect(() => {
    const claimed = new URLSearchParams(window.location.search).get("claimed");
    if (claimed) setSelected(claimed);
  }, []);

  useEffect(() => {
    async function refresh() {
      const res = await fetch("/api/plots", { cache: "no-store" });
      const json = await res.json();
      if (json.plots) setPlots(json.plots as PlotRecord[]);
    }
    const timer = window.setInterval(refresh, supabaseEnabled ? 12000 : 4000);
    return () => window.clearInterval(timer);
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    const client = createBrowserClient();
    if (!client) return;
    const channel = client
      .channel("plots-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "plots" }, () => {
        fetch("/api/plots", { cache: "no-store" })
          .then((r) => r.json())
          .then((json) => {
            if (json.plots) setPlots(json.plots as PlotRecord[]);
          });
      })
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [supabaseEnabled]);

  function onClaimed(plot: PlotRecord) {
    setPlots((list) => list.map((p) => (p.slug === plot.slug ? plot : p)));
    if (plot.ownerEmail) rememberOwnership(plot.slug, plot.ownerEmail);
    setWon(plot);
    setSelected(null);
  }

  const claimed = plots.filter((p) => p.ownerName).length;
  const revenue = plots.reduce((sum, p) => sum + (p.ownerName ? p.currentPriceCents : 0), 0);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-3">
      <LiveToasts plots={plots} ignoreSlug={won?.slug ?? null} />
      <header className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <img
            src="/logo-ownmars.png"
            alt="Own Mars"
            className="h-[1.8rem] w-auto sm:h-[2.2rem]"
          />
          <h1 className="mt-2 text-4xl font-semibold tracking-tight max-sm:text-3xl sm:text-5xl">
            Colonize Mars. $1 a plot.
          </h1>
          <p className="mt-1 max-w-xl text-base text-dust max-sm:hidden">
            50 named territories. Pay $1 more than the current owner and your name, logo and slogan go on the map.
          </p>
          <StatsPill />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" size="lg">
            Claimed {claimed}/50
          </Badge>
          <Badge variant="outline" size="lg">
            Staked ${(revenue / 100).toFixed(0)}
          </Badge>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <MarsGlobe plots={plots} selectedSlug={selected} onSelect={setSelected} />
      </div>
      <footer className="mt-3 flex shrink-0 flex-col gap-1 text-[13px] text-white/35 sm:flex-row sm:justify-between">
        <p>Plots are permanent. No expiry. Whoever pays more owns the land.</p>
        <p>
          Globe: NASA/JPL-Caltech. Not affiliated with SpaceX. A game about claiming pixels on a dead planet.
        </p>
      </footer>
      {!won && (
        <ClaimDrawer
          plot={selectedPlot}
          payments={payments}
          onClose={() => setSelected(null)}
          onClaimed={onClaimed}
        />
      )}
      {won && <SuccessModal plot={won} onClose={() => setWon(null)} />}
    </div>
  );
}
