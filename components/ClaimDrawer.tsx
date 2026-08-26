"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlertIcon } from "lucide-react";
import type { BidMultiplier, PlotRecord } from "@/lib/types";
import { amountForMultiplier, formatUsd, minBidCents } from "@/lib/pricing";
import { faviconUrl } from "@/lib/url";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

type Payments = {
  whop: boolean;
  paddle: boolean;
  cryptomus: boolean;
  devSimulate: boolean;
};

type Props = {
  plot: PlotRecord | null;
  payments: Payments;
  onClose: () => void;
  onClaimed: (plot: PlotRecord) => void;
};

const CLOSE_MS = 700;

export function ClaimDrawer({ plot, payments, onClose, onClaimed }: Props) {
  const [drawnPlot, setDrawnPlot] = useState<PlotRecord | null>(plot);
  const [multiplier, setMultiplier] = useState<BidMultiplier>("min");
  const [ownerName, setOwnerName] = useState("");
  const [ownerUrl, setOwnerUrl] = useState("");
  const [warCry, setWarCry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"whop" | "dev" | null>(null);

  useEffect(() => {
    if (plot) {
      setDrawnPlot(plot);
      return;
    }
    const timer = window.setTimeout(() => setDrawnPlot(null), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [plot]);

  const amount = useMemo(
    () => (drawnPlot ? amountForMultiplier(drawnPlot, multiplier) : 0),
    [drawnPlot, multiplier],
  );

  const min = drawnPlot ? minBidCents(drawnPlot) : 0;
  const logo = drawnPlot ? faviconUrl(drawnPlot.ownerUrl) : null;
  const configured = payments.whop || payments.devSimulate;

  async function submit(provider: "whop" | "dev") {
    if (!plot) return;
    const current = plot;
    setError(null);
    setBusy(provider);
    try {
      const path = provider === "dev" ? "/api/dev/simulate-payment" : "/api/checkout";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: current.slug,
          multiplier,
          ownerName,
          ownerUrl,
          warCry,
          provider: provider === "dev" ? undefined : "whop",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl as string;
        return;
      }
      if (json.ok && json.plot) {
        onClaimed(json.plot as PlotRecord);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={Boolean(plot)} onOpenChange={(open) => { if (!open) onClose(); }}>
      {drawnPlot && (
        <SheetContent side="right" className="z-50">
          <SheetHeader>
            <SheetTitle className="text-3xl">{drawnPlot.name}</SheetTitle>
            <SheetDescription className="text-base">
              Current stake {formatUsd(drawnPlot.currentPriceCents)} · min claim {formatUsd(min)}
            </SheetDescription>
          </SheetHeader>
          <SheetPanel className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                {drawnPlot.ownerName ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 rounded-lg">
                      {logo ? <AvatarImage src={logo} alt="" /> : null}
                      <AvatarFallback className="rounded-lg">
                        {drawnPlot.ownerName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-xl">{drawnPlot.ownerName}</CardTitle>
                      {drawnPlot.warCry && (
                        <CardDescription className="truncate text-base">{drawnPlot.warCry}</CardDescription>
                      )}
                      {drawnPlot.ownerUrl && (
                        <a
                          href={`/r/${drawnPlot.slug}`}
                          className="truncate text-sm text-success hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {drawnPlot.ownerUrl} · {drawnPlot.clickCount} clicks
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-xl">Uninhabited territory</CardTitle>
                    <CardDescription className="text-base">
                      No owner yet. First claim starts at {formatUsd(min)}.
                    </CardDescription>
                  </>
                )}
              </CardHeader>
            </Card>

            <Tabs
              value={multiplier}
              onValueChange={(value) => setMultiplier(value as BidMultiplier)}
              className="w-full gap-0"
            >
              <TabsList size="lg" className="w-full bg-[#08090c]">
                {(["min", "2x", "5x"] as BidMultiplier[]).map((key) => {
                  const usd = formatUsd(amountForMultiplier(drawnPlot, key));
                  return (
                    <TabsTab
                      key={key}
                      value={key}
                      className="h-11 min-h-11 flex-1 flex-col gap-0 py-0 text-base sm:text-base"
                    >
                      <span>{key === "min" ? "Min" : key}</span>
                      <span className="text-[15px] font-normal text-primary opacity-80 in-data-active:opacity-100">
                        {usd}
                      </span>
                    </TabsTab>
                  );
                })}
              </TabsList>
            </Tabs>

            <Field>
              <FieldLabel className="text-base sm:text-base">Company / handle</FieldLabel>
              <Input
                nativeInput
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="SpaceX"
              />
            </Field>
            <Field>
              <FieldLabel className="text-base sm:text-base">URL</FieldLabel>
              <Input
                nativeInput
                value={ownerUrl}
                onChange={(e) => setOwnerUrl(e.target.value)}
                placeholder="https://x.com/you"
              />
            </Field>
            <Field>
              <FieldLabel className="text-base sm:text-base">Slogan</FieldLabel>
              <Input
                nativeInput
                value={warCry}
                maxLength={60}
                onChange={(e) => setWarCry(e.target.value)}
                placeholder="Mars is ours"
              />
            </Field>

            {error && (
              <Alert variant="error">
                <CircleAlertIcon />
                <AlertTitle>Claim failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!configured && (
              <Alert>
                <CircleAlertIcon />
                <AlertTitle>Payments not configured</AlertTitle>
                <AlertDescription>
                  Add Whop API keys to enable checkout.
                </AlertDescription>
              </Alert>
            )}
          </SheetPanel>
          <SheetFooter className="flex-col sm:flex-col">
            <Button
              size="lg"
              className="w-full text-lg sm:text-lg"
              disabled={!payments.whop || Boolean(busy)}
              loading={busy === "whop"}
              onClick={() => submit("whop")}
            >
              Pay with Whop · Claim for {formatUsd(amount)}
            </Button>
            {payments.devSimulate && (
              <Button
                variant="outline"
                className="w-full border-dashed text-base sm:text-base"
                disabled={Boolean(busy)}
                loading={busy === "dev"}
                onClick={() => submit("dev")}
              >
                Dev: simulate payment
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      )}
    </Sheet>
  );
}
