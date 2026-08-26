import { NextResponse } from "next/server";
import { completePaidClaim } from "@/lib/complete-claim";
import { env } from "@/lib/env";
import { verifyPaddleSignature } from "@/lib/payments";

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = env("PADDLE_WEBHOOK_SECRET");
  if (secret) {
    const signature = req.headers.get("paddle-signature") || "";
    if (!verifyPaddleSignature(raw, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }
  const event = JSON.parse(raw) as {
    event_type?: string;
    data?: {
      custom_data?: Record<string, string>;
      id?: string;
      status?: string;
    };
  };
  const paid =
    event.event_type === "transaction.completed" ||
    event.event_type === "transaction.paid" ||
    event.data?.status === "completed" ||
    event.data?.status === "paid";
  if (!paid) return NextResponse.json({ ok: true, ignored: true });
  const custom = event.data?.custom_data ?? {};
  const result = await completePaidClaim({
    slug: custom.slug,
    amountCents: Number(custom.amountCents),
    ownerName: custom.ownerName,
    ownerUrl: custom.ownerUrl,
    warCry: custom.warCry ?? "",
    ownerEmail: custom.ownerEmail,
    provider: "paddle",
    providerRef: event.data?.id || "paddle",
  });
  return NextResponse.json(result);
}
