import { NextResponse } from "next/server";
import { getPlot, incrementClicks } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const plot = await getPlot(params.slug);
  if (!plot?.ownerUrl) {
    return NextResponse.redirect(new URL("/", _req.url));
  }
  await incrementClicks(params.slug);
  return NextResponse.redirect(plot.ownerUrl);
}
