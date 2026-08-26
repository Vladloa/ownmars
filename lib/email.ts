import { Resend } from "resend";
import { appUrl, env, hasResend } from "./env";
import { outbidTweet } from "./tweets";
import { formatUsd } from "./pricing";

export async function sendOutbidEmail(opts: {
  to: string;
  plotName: string;
  amountCents: number;
  newOwner: string;
}) {
  if (!hasResend() || !opts.to) return;
  const resend = new Resend(env("RESEND_API_KEY"));
  const from = env("RESEND_FROM") || "OwnMars <hello@ownmars.lol>";
  const reclaim = appUrl();
  await resend.emails.send({
    from,
    to: opts.to,
    subject: `Someone just claimed your Mars plot ${opts.plotName}`,
    text: `Someone just claimed your Mars plot ${opts.plotName} for ${formatUsd(opts.amountCents)}. ${opts.newOwner} holds it now.\n\nReclaim it → ${reclaim}\n\nTweet: ${outbidTweet()}`,
  });
}
