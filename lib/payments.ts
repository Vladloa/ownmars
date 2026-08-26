import { createHmac, createHash, timingSafeEqual } from "crypto";
import { appUrl, env, hasCryptomus, hasPaddle, hasWhop, paddleSandbox, whopApiBase } from "./env";

export function paymentStatus() {
  return {
    whop: hasWhop(),
    paddle: hasPaddle(),
    cryptomus: hasCryptomus(),
    devSimulate: process.env.NODE_ENV !== "production",
  };
}

type WhopCheckoutOpts = {
  slug: string;
  plotName: string;
  amountCents: number;
  ownerName: string;
  ownerUrl: string;
  warCry: string;
  ownerEmail: string;
};

function whopHeaders() {
  return {
    Authorization: `Bearer ${env("WHOP_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

function claimMetadata(opts: WhopCheckoutOpts) {
  return {
    slug: opts.slug,
    amountCents: String(opts.amountCents),
    ownerName: opts.ownerName,
    ownerUrl: opts.ownerUrl,
    warCry: opts.warCry,
    ownerEmail: opts.ownerEmail,
  };
}

async function createWhopPlan(opts: WhopCheckoutOpts) {
  const price = opts.amountCents / 100;
  const productId = env("WHOP_PRODUCT_ID");
  const body: Record<string, unknown> = {
    company_id: env("WHOP_COMPANY_ID"),
    plan_type: "one_time",
    currency: "usd",
    initial_price: price,
    title: `OwnMars · ${opts.plotName}`,
    description: `Claim ${opts.plotName} for $${price.toFixed(2)}`,
    visibility: "visible",
  };
  if (productId) body.product_id = productId;
  const res = await fetch(`${whopApiBase()}/plans`, {
    method: "POST",
    headers: whopHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    id?: string;
    purchase_url?: string;
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.id) {
    return {
      ok: false as const,
      error: json.error?.message || json.message || "Whop plan failed",
    };
  }
  return { ok: true as const, planId: json.id, purchaseUrl: json.purchase_url };
}

export async function createWhopCheckout(opts: WhopCheckoutOpts) {
  if (!hasWhop()) return { ok: false as const, error: "Whop is not configured" };
  const price = opts.amountCents / 100;
  const base = whopApiBase();
  const productId = env("WHOP_PRODUCT_ID");
  const metadata = claimMetadata(opts);
  const redirectUrl = `${appUrl()}/?claimed=${opts.slug}`;

  // Sandbox (and some company keys) reject inline account_id plans.
  // Create a one-time plan, then wrap it in a checkout configuration for metadata.
  if (productId || base.includes("sandbox-api.whop.com")) {
    const plan = await createWhopPlan(opts);
    if (!plan.ok) return plan;
    const res = await fetch(`${base}/checkout_configurations`, {
      method: "POST",
      headers: whopHeaders(),
      body: JSON.stringify({
        mode: "payment",
        plan_id: plan.planId,
        redirect_url: redirectUrl,
        metadata,
      }),
    });
    const json = (await res.json()) as {
      id?: string;
      purchase_url?: string;
      error?: { message?: string };
      message?: string;
    };
    if (!res.ok || !json.purchase_url) {
      // Fallback to the plan purchase URL if configuration create fails.
      if (plan.purchaseUrl) {
        return { ok: true as const, checkoutUrl: plan.purchaseUrl, checkoutId: plan.planId };
      }
      return {
        ok: false as const,
        error: json.error?.message || json.message || "Whop checkout failed",
      };
    }
    return {
      ok: true as const,
      checkoutUrl: json.purchase_url,
      checkoutId: json.id,
    };
  }

  const res = await fetch(`${base}/checkout_configurations`, {
    method: "POST",
    headers: whopHeaders(),
    body: JSON.stringify({
      account_id: env("WHOP_COMPANY_ID"),
      mode: "payment",
      redirect_url: redirectUrl,
      metadata,
      plan: {
        plan_type: "one_time",
        currency: "usd",
        initial_price: price,
        title: `OwnMars · ${opts.plotName}`,
        description: `Claim ${opts.plotName} for $${price.toFixed(2)}`,
        force_create_new_plan: true,
      },
    }),
  });
  const json = (await res.json()) as {
    id?: string;
    purchase_url?: string;
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.purchase_url) {
    return {
      ok: false as const,
      error: json.error?.message || json.message || "Whop checkout failed",
    };
  }
  return {
    ok: true as const,
    checkoutUrl: json.purchase_url,
    checkoutId: json.id,
  };
}

export function verifyWhopWebhook(rawBody: string, headers: Headers) {
  const secret = env("WHOP_WEBHOOK_SECRET");
  if (!secret) return false;
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;
  const ageSec = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSec) || ageSec > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const candidates = signatureHeader
    .split(/\s+/)
    .map((part) => part.replace(/^v1,/, "").trim())
    .filter(Boolean);
  const expectedBuf = Buffer.from(expected);
  return candidates.some((candidate) => {
    const got = Buffer.from(candidate);
    return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf);
  });
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
