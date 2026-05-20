import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAllRegistrations } from "@/lib/registrations";
import { searchLocations, type LocationSearchKind } from "@/lib/reference/locations";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kindParam = searchParams.get("kind");
  if (kindParam !== "countries" && kindParam !== "airports") {
    return NextResponse.json({ error: "Invalid location search kind" }, { status: 400 });
  }

  const preferredCountry = await getPreferredCountry(session.email, session.company);
  const selected = searchParams
    .get("selected")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const options = searchLocations({
    kind: kindParam as LocationSearchKind,
    query: searchParams.get("q") ?? "",
    selected,
    preferredCountry,
    limit: kindParam === "countries" ? 10 : 8,
  });

  return NextResponse.json({ options, preferredCountry });
}

async function getPreferredCountry(email: string, company: string) {
  const registrations = await getAllRegistrations();
  const registration = registrations.find((item) => item.email === email) ??
    registrations.find((item) => item.company.trim().toLowerCase() === company.trim().toLowerCase());
  return registration?.country;
}
