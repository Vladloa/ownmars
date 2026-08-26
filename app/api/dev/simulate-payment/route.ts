import { NextResponse } from "next/server";
import { completePaidClaim } from "@/lib/complete-claim";
import { catalogBySlug } from "@/lib/plots-catalog";
import { getPlot } from "@/lib/store";
import { amountForMultiplier, minBidCents } from "@/lib/pricing";
import { isValidHttpUrl, normalizeUrl } from "@/lib/url";
import type { BidMultiplier } from "@/lib/types";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const body = (await req.json()) as {
    slug?: string;
    multiplier?: BidMultiplier;
    ownerName?: string;
    ownerUrl?: string;
    warCry?: string;
    ownerEmail?: string;
  };
  const catalog = body.slug ? catalogBySlug(body.slug) : undefined;
  const plot = body.slug ? await getPlot(body.slug) : null;
  if (!catalog || !plot) {
    return NextResponse.json({ error: "Unknown plot" }, { status: 404 });
  }
  const name = (body.ownerName ?? "").trim();
  const url = (body.ownerUrl ?? "").trim();
  const email = (body.ownerEmail ?? "").trim();
  if (!name || !isValidHttpUrl(url) || !email.includes("@")) {
    return NextResponse.json({ error: "Name, valid URL and email are required" }, { status: 400 });
  }
  const multiplier: BidMultiplier = body.multiplier ?? "min";
  const amountCents = amountForMultiplier(plot, multiplier);
  if (amountCents < minBidCents(plot)) {
    return NextResponse.json({ error: "Bid too low" }, { status: 409 });
  }
  const result = await completePaidClaim({
    slug: plot.slug,
    amountCents,
    ownerName: name,
    ownerUrl: normalizeUrl(url),
    warCry: (body.warCry ?? "").trim().slice(0, 60),
    ownerEmail: email,
    provider: "dev",
    providerRef: `dev-${Date.now()}`,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }
  return NextResponse.json(result);
}
