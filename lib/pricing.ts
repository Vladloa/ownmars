import type { BidMultiplier, PlotRecord } from "./types";
import { START_PRICE_CENTS } from "./plots-catalog";

export function minBidCents(plot: PlotRecord) {
  if (!plot.ownerName) return START_PRICE_CENTS;
  return plot.currentPriceCents + START_PRICE_CENTS;
}

export function amountForMultiplier(plot: PlotRecord, multiplier: BidMultiplier) {
  const min = minBidCents(plot);
  if (multiplier === "min") return min;
  if (multiplier === "2x") return min * 2;
  return min * 5;
}

export function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
