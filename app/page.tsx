import { unstable_noStore as noStore } from "next/cache";
import { HomeClient } from "@/components/HomeClient";
import { listPlots } from "@/lib/store";
import { paymentStatus } from "@/lib/payments";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  noStore();
  const plots = await listPlots();
  return (
    <HomeClient
      initialPlots={plots}
      payments={paymentStatus()}
      supabaseEnabled={hasSupabase()}
    />
  );
}
