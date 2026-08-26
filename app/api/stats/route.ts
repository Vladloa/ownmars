import { NextResponse } from "next/server";

export const revalidate = 60;

type OverviewResponse = {
  status?: string;
  data?: Array<{ visitors?: number }>;
};

export async function GET() {
  const key = process.env.DATAFAST_API_KEY;
  if (!key) {
    return NextResponse.json(
      { visitors: null },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  }

  try {
    const res = await fetch("https://datafa.st/api/v1/analytics/overview?fields=visitors", {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json({ visitors: null }, { status: 200 });
    }
    const json = (await res.json()) as OverviewResponse;
    const visitors = json.data?.[0]?.visitors;
    return NextResponse.json(
      { visitors: typeof visitors === "number" ? visitors : null },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch {
    return NextResponse.json({ visitors: null });
  }
}
