import { createHmac, createHash } from "crypto";
import { appUrl, env, hasCryptomus, hasPaddle, paddleSandbox } from "./env";

export function paymentStatus() {
  return {
    paddle: hasPaddle(),
    cryptomus: hasCryptomus(),
    devSimulate: process.env.NODE_ENV !== "production",
  };
}

export async function createPaddleCheckout(opts: {
  slug: string;
  plotName: string;
  amountCents: number;
  ownerName: string;
  ownerUrl: string;
  warCry: string;
  ownerEmail: string;
}) {
  if (!hasPaddle()) return { ok: false as const, error: "Paddle is not configured" };
  const base = paddleSandbox()
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
  const res = await fetch(`${base}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("PADDLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          quantity: 1,
          price: {
            description: `Claim ${opts.plotName}`,
            name: opts.plotName,
            unit_price: { amount: String(opts.amountCents), currency_code: "USD" },
            product: {
              name: `OwnMars · ${opts.plotName}`,
              tax_category: "standard",
            },
          },
        },
      ],
      custom_data: {
        slug: opts.slug,
        amountCents: String(opts.amountCents),
        ownerName: opts.ownerName,
        ownerUrl: opts.ownerUrl,
        warCry: opts.warCry,
        ownerEmail: opts.ownerEmail,
      },
      checkout: {
        url: `${appUrl()}/?claimed=${opts.slug}`,
      },
    }),
  });
  const json = (await res.json()) as {
    data?: { id?: string; checkout?: { url?: string } };
    error?: { detail?: string };
  };
  if (!res.ok) {
    return { ok: false as const, error: json.error?.detail || "Paddle checkout failed" };
  }
  return {
    ok: true as const,
    checkoutUrl: json.data?.checkout?.url,
    transactionId: json.data?.id,
  };
}

export function verifyPaddleSignature(rawBody: string, signatureHeader: string) {
  const secret = env("PADDLE_WEBHOOK_SECRET");
  if (!secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((part) => {
      const [k, v] = part.split("=");
      return [k.trim(), (v ?? "").trim()];
    })
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;
  const signed = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return signed === h1;
}

export async function createCryptomusInvoice(opts: {
  slug: string;
  plotName: string;
  amountCents: number;
  ownerName: string;
  ownerUrl: string;
  warCry: string;
  ownerEmail: string;
}) {
  if (!hasCryptomus()) return { ok: false as const, error: "Cryptomus is not configured" };
  const amount = (opts.amountCents / 100).toFixed(2);
  const payload = {
    amount,
    currency: "USD",
    order_id: `ownmars-${opts.slug}-${Date.now()}`,
    url_return: `${appUrl()}/?claimed=${opts.slug}`,
    url_callback: `${appUrl()}/api/webhooks/cryptomus`,
    additional_data: JSON.stringify({
      slug: opts.slug,
      amountCents: opts.amountCents,
      ownerName: opts.ownerName,
      ownerUrl: opts.ownerUrl,
      warCry: opts.warCry,
      ownerEmail: opts.ownerEmail,
    }),
  };
  const body = JSON.stringify(payload);
  const sign = createHash("md5")
    .update(Buffer.from(body).toString("base64") + env("CRYPTOMUS_API_KEY"))
    .digest("hex");
  const res = await fetch("https://api.cryptomus.com/v1/payment", {
    method: "POST",
    headers: {
      merchant: env("CRYPTOMUS_MERCHANT_ID"),
      sign,
      "Content-Type": "application/json",
    },
    body,
  });
  const json = (await res.json()) as {
    result?: { url?: string; uuid?: string };
    message?: string;
  };
  if (!res.ok || !json.result?.url) {
    return { ok: false as const, error: json.message || "Cryptomus invoice failed" };
  }
  return { ok: true as const, checkoutUrl: json.result.url, invoiceId: json.result.uuid };
}

export function verifyCryptomusSign(body: Record<string, unknown>) {
  const incoming = String(body.sign ?? "");
  const clone = { ...body };
  delete clone.sign;
  const json = JSON.stringify(clone);
  const expected = createHash("md5")
    .update(Buffer.from(json).toString("base64") + env("CRYPTOMUS_API_KEY"))
    .digest("hex");
  return incoming === expected;
}
