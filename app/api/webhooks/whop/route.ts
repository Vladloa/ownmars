import { NextResponse } from "next/server";
import { completePaidClaim } from "@/lib/complete-claim";
import { resolveWhopClaimMetadata, verifyWhopWebhook } from "@/lib/payments";

type WhopPaymentEvent = {
  type?: string;
  action?: string;
  data?: {
    id?: string;
    metadata?: Record<string, string | number | null | undefined>;
    plan?: {
      id?: string;
      metadata?: Record<string, string | number | null | undefined>;
    };
    user?: { email?: string | null };
  };
};

function metaString(meta: Record<string, string | number | null | undefined> | undefined, key: string) {
  const value = meta?.[key];
  return value == null ? "" : String(value);
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWhopWebhook(raw, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw) as WhopPaymentEvent;
  const type = event.type || event.action || "";
  if (type !== "payment.succeeded" && type !== "payment_succeeded" && type !== "app_payment_succeeded") {
    return NextResponse.json({ ok: true, ignored: true, type });
  }

  const meta = await resolveWhopClaimMetadata(event.data ?? {});
  const result = await completePaidClaim({
    slug: metaString(meta, "slug"),
    amountCents: Number(metaString(meta, "amountCents")),
    ownerName: metaString(meta, "ownerName"),
    ownerUrl: metaString(meta, "ownerUrl"),
    warCry: metaString(meta, "warCry"),
    ownerEmail: metaString(meta, "ownerEmail") || event.data?.user?.email || "",
    provider: "whop",
    providerRef: event.data?.id || "whop",
  });

  return NextResponse.json(result);
}
