import { NextResponse } from "next/server";
import { completePaidClaim } from "@/lib/complete-claim";
import { verifyWhopWebhook } from "@/lib/payments";

type WhopPaymentEvent = {
  type?: string;
  action?: string;
  data?: {
    id?: string;
    metadata?: Record<string, string | number | null | undefined>;
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
  if (type !== "payment.succeeded") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const meta = event.data?.metadata ?? {};
  const result = await completePaidClaim({
    slug: metaString(meta, "slug"),
    amountCents: Number(metaString(meta, "amountCents")),
    ownerName: metaString(meta, "ownerName"),
    ownerUrl: metaString(meta, "ownerUrl"),
    warCry: metaString(meta, "warCry"),
    ownerEmail: metaString(meta, "ownerEmail"),
    provider: "whop",
    providerRef: event.data?.id || "whop",
  });

  return NextResponse.json(result);
}
