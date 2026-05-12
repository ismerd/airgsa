import { NextRequest, NextResponse } from "next/server";

const FR24_BASE = "https://fr24api.flightradar24.com";

type Fr24Position = {
  fr24_id: string;
  flight?: string;
  callsign?: string;
  type?: string;
  reg?: string;
  alt?: number;
  gspeed?: number;
  painted_as?: string;
  operating_as?: string;
  orig_iata?: string;
  dest_iata?: string;
};

export async function GET(req: NextRequest) {
  const apiKey =
    req.nextUrl.searchParams.get("apiKey") ??
    process.env.FLIGHTRADAR24_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "No API key provided." },
      { status: 400 }
    );
  }

  const h = {
    Authorization: `Bearer ${apiKey}`,
    "Accept-Version": "v1",
    Accept: "application/json",
  };

  const start = Date.now();

  try {
    // Query FR24's cargo-only category for Saudia-painted flights and SVL-operated flights.
    const [svaRes, svlRes] = await Promise.all([
      fetch(`${FR24_BASE}/api/live/flight-positions/full?painted_as=SVA&categories=C&limit=100`, {
        headers: h,
        cache: "no-store",
      }),
      fetch(`${FR24_BASE}/api/live/flight-positions/full?operating_as=SVL&categories=C&limit=50`, {
        headers: h,
        cache: "no-store",
      }),
    ]);

    const svaFlights: Fr24Position[] = svaRes.ok
      ? ((await svaRes.json()).data ?? [])
      : [];
    const svlFlights: Fr24Position[] = svlRes.ok
      ? ((await svlRes.json()).data ?? [])
      : [];

    // Count aircraft types to help diagnose what codes FR24 uses
    const typeCounts: Record<string, number> = {};
    for (const f of [...svaFlights, ...svlFlights]) {
      const t = f.type ?? "(unknown)";
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }

    const svaCargoFlights = svaFlights;

    // Flight-summary enrichment on first batch
    const allFlights = [...svaFlights, ...svlFlights];
    let summaryData: unknown[] = [];
    let summaryStatus: number | null = null;
    let summaryError: string | null = null;

    if (allFlights.length > 0) {
      const ids = allFlights.slice(0, 15).map(f => f.fr24_id).join(",");
      try {
        const sumRes = await fetch(
          `${FR24_BASE}/api/flight-summary/light?flight_ids=${ids}&limit=20`,
          { headers: h, cache: "no-store" }
        );
        summaryStatus = sumRes.status;
        if (sumRes.ok) {
          const sumJson = await sumRes.json();
          summaryData = sumJson.data ?? [];
        } else {
          summaryError = await sumRes.text();
        }
      } catch (e) {
        summaryError = (e as Error).message;
      }
    }

    return NextResponse.json({
      ok: true,
      elapsed: Date.now() - start,
      airline: "Saudia Cargo",
      flightCount: allFlights.length,
      samplePositions: allFlights.slice(0, 5),

      // SVA (Saudia Airlines parent) breakdown
      sva: {
        total: svaFlights.length,
        freighters: svaCargoFlights.length,
        freighterSample: svaCargoFlights.slice(0, 3),
        allTypeCounts: Object.fromEntries(
          Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
        ),
      },

      // SVL (Saudia Cargo subsidiary — may be empty if code is wrong)
      svl: {
        status: svlRes.status,
        total: svlFlights.length,
        sample: svlFlights.slice(0, 3),
      },

      // Flight-summary
      flightSummary: {
        status: summaryStatus,
        count: summaryData.length,
        sample: summaryData.slice(0, 2),
        error: summaryError,
      },

      endpoints: {
        livePositions: `${FR24_BASE}/api/live/flight-positions/full?painted_as=SVA&categories=C&limit=100`,
        flightSummary: allFlights.length > 0
          ? `${FR24_BASE}/api/flight-summary/light?flight_ids={ids}&limit=20`
          : null,
        sva: `${FR24_BASE}/api/live/flight-positions/full?painted_as=SVA&categories=C&limit=100`,
        svl: `${FR24_BASE}/api/live/flight-positions/full?operating_as=SVL&categories=C&limit=50`,
      },
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      elapsed: Date.now() - start,
      error: (err as Error).message,
    });
  }
}
