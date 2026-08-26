import { HomeClient } from "@/components/HomeClient";
import { listPlots } from "@/lib/store";
import { paymentStatus } from "@/lib/payments";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Home() {
  const plots = await listPlots();
  return (
    <HomeClient
      initialPlots={plots}
      payments={paymentStatus()}
      supabaseEnabled={hasSupabase()}
    />
  );
}
