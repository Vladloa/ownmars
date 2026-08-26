import { sendOutbidEmail } from "./email";
import { claimPlot } from "./store";
import type { ClaimPayload, ClaimResult } from "./types";

export async function completePaidClaim(payload: ClaimPayload): Promise<ClaimResult> {
  if (!payload.slug || !payload.ownerName || !payload.ownerUrl || !payload.amountCents) {
    return { ok: false, reason: "invalid" };
  }
  const result = await claimPlot(payload);
  if (result.ok && result.outbid && result.previousEmail) {
    try {
      await sendOutbidEmail({
        to: result.previousEmail,
        plotName: result.plot.name,
        amountCents: result.plot.currentPriceCents,
        newOwner: result.plot.ownerName || "another colonist",
      });
    } catch {
      // Claim still stands if mail fails.
    }
  }
  return result;
}
