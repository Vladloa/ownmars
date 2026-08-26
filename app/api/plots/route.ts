import { NextResponse } from "next/server";
import { listPlots } from "@/lib/store";
import { paymentStatus } from "@/lib/payments";
import { hasSupabase, hasResend } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const plots = await listPlots();
  return NextResponse.json({
    plots,
    payments: paymentStatus(),
    supabase: hasSupabase(),
    email: hasResend(),
  });
}
