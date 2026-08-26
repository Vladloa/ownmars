import { NextResponse } from "next/server";
import { catalogBySlug } from "@/lib/plots-catalog";
import { getPlot } from "@/lib/store";
import { amountForMultiplier, minBidCents } from "@/lib/pricing";
import { isValidHttpUrl, normalizeUrl } from "@/lib/url";
import { createCryptomusInvoice, createPaddleCheckout, paymentStatus } from "@/lib/payments";
import type { BidMultiplier } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    slug?: string;
    multiplier?: BidMultiplier;
    ownerName?: string;
    ownerUrl?: string;
    warCry?: string;
    ownerEmail?: string;
    provider?: "paddle" | "cryptomus";
  };
  const catalog = body.slug ? catalogBySlug(body.slug) : undefined;
  const plot = body.slug ? await getPlot(body.slug) : null;
  if (!catalog || !plot) {
    return NextResponse.json({ error: "Unknown plot" }, { status: 404 });
  }
  const name = (body.ownerName ?? "").trim();
  const url = (body.ownerUrl ?? "").trim();
  const email = (body.ownerEmail ?? "").trim();
  const warCry = (body.warCry ?? "").trim().slice(0, 60);
  if (!name || !isValidHttpUrl(url) || !email.includes("@")) {
    return NextResponse.json({ error: "Name, valid URL and email are required" }, { status: 400 });
  }
  const multiplier: BidMultiplier = body.multiplier ?? "min";
  const amountCents = amountForMultiplier(plot, multiplier);
  if (amountCents < minBidCents(plot)) {
    return NextResponse.json({ error: "Bid too low" }, { status: 409 });
  }
  const status = paymentStatus();
  const payload = {
    slug: plot.slug,
    plotName: plot.name,
    amountCents,
    ownerName: name,
    ownerUrl: normalizeUrl(url),
    warCry,
    ownerEmail: email,
  };
  if (body.provider === "paddle") {
    if (!status.paddle) {
      return NextResponse.json({ error: "Card payments are not configured yet" }, { status: 503 });
    }
    const checkout = await createPaddleCheckout(payload);
    if (!checkout.ok) return NextResponse.json({ error: checkout.error }, { status: 502 });
    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl, transactionId: checkout.transactionId });
  }
  if (body.provider === "cryptomus") {
    if (!status.cryptomus) {
      return NextResponse.json({ error: "Crypto payments are not configured yet" }, { status: 503 });
    }
    const invoice = await createCryptomusInvoice(payload);
    if (!invoice.ok) return NextResponse.json({ error: invoice.error }, { status: 502 });
    return NextResponse.json({ checkoutUrl: invoice.checkoutUrl, invoiceId: invoice.invoiceId });
  }
  return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
}
