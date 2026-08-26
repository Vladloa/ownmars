import { NextResponse } from "next/server";
import { completePaidClaim } from "@/lib/complete-claim";
import { env } from "@/lib/env";
import { verifyCryptomusSign } from "@/lib/payments";

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (env("CRYPTOMUS_API_KEY") && !verifyCryptomusSign(body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const status = String(body.status ?? "");
  if (!["paid", "paid_over"].includes(status)) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  let extra: Record<string, string> = {};
  try {
    extra = JSON.parse(String(body.additional_data || "{}")) as Record<string, string>;
  } catch {
    extra = {};
  }
  const result = await completePaidClaim({
    slug: extra.slug,
    amountCents: Number(extra.amountCents),
    ownerName: extra.ownerName,
    ownerUrl: extra.ownerUrl,
    warCry: extra.warCry ?? "",
    ownerEmail: extra.ownerEmail,
    provider: "cryptomus",
    providerRef: String(body.uuid ?? body.order_id ?? "cryptomus"),
  });
  return NextResponse.json(result);
}
