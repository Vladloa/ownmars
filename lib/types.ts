export type PlotTier = "S" | "A" | "B";

export type PlotCatalogItem = {
  slug: string;
  name: string;
  tier: PlotTier;
  lon: number;
  lat: number;
};

export type PlotRecord = PlotCatalogItem & {
  currentPriceCents: number;
  ownerName: string | null;
  ownerUrl: string | null;
  warCry: string | null;
  ownerEmail: string | null;
  clickCount: number;
  updatedAt: string;
};

export type BidMultiplier = "min" | "2x" | "5x";

export type ClaimPayload = {
  slug: string;
  amountCents: number;
  ownerName: string;
  ownerUrl: string;
  warCry: string;
  ownerEmail: string;
  provider: "paddle" | "cryptomus" | "whop" | "dev";
  providerRef: string;
};

export type ClaimResult =
  | {
      ok: true;
      plot: PlotRecord;
      previousEmail: string | null;
      previousName: string | null;
      outbid: boolean;
    }
  | { ok: false; reason: "stale" | "not_found" | "invalid" };
