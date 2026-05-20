import airportsReference from "@/lib/reference/airports.json";
import countriesReference from "@/lib/reference/countries.json";

export type LocationSearchKind = "countries" | "airports";

export type LocationSearchOption = {
  value: string;
  label: string;
  meta: string;
};

type AirportReference = {
  code: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  type: string;
};

type CountryReference = {
  code: string;
  name: string;
  region?: string;
  subregion?: string;
  borders?: string[];
};

const airports = airportsReference as AirportReference[];
const countries = countriesReference as CountryReference[];

export function searchLocations({
  kind,
  query,
  selected,
  preferredCountry,
  limit = 8,
}: {
  kind: LocationSearchKind;
  query?: string;
  selected?: string[];
  preferredCountry?: string;
  limit?: number;
}): LocationSearchOption[] {
  if (kind === "countries") return searchCountries(query, selected, preferredCountry, limit);
  return searchAirports(query, selected, preferredCountry, limit);
}

function searchCountries(query = "", selected: string[] = [], preferredCountry?: string, limit = 8): LocationSearchOption[] {
  const normalizedQuery = normalize(query);
  const selectedSet = new Set(selected.map(normalize));
  const preferredContext = getPreferredCountryContext(preferredCountry);

  return countries
    .filter((country) => !selectedSet.has(normalize(country.name)))
    .filter((country) => !normalizedQuery || normalize(`${country.name} ${country.code}`).includes(normalizedQuery))
    .sort(
      (left, right) =>
        countryMatchRank(left, normalizedQuery) - countryMatchRank(right, normalizedQuery) ||
        countryPriority(left, preferredContext) - countryPriority(right, preferredContext) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, limit)
    .map((country) => ({
      value: country.name,
      label: country.name,
      meta: `Country - ${country.code}`,
    }));
}

function searchAirports(query = "", selected: string[] = [], preferredCountry?: string, limit = 8): LocationSearchOption[] {
  const normalizedQuery = normalize(query);
  const selectedSet = new Set(selected.map(normalize));
  const preferredContext = getPreferredCountryContext(preferredCountry);

  return airports
    .filter((airport) => !selectedSet.has(normalize(airport.code)))
    .filter((airport) => {
      if (!normalizedQuery) return true;
      return normalize(`${airport.code} ${airport.name} ${airport.city} ${airport.country} ${airport.countryCode}`).includes(normalizedQuery);
    })
    .sort(
      (left, right) =>
        airportMatchRank(left, normalizedQuery) - airportMatchRank(right, normalizedQuery) ||
        airportCountryPriority(left, preferredContext) - airportCountryPriority(right, preferredContext) ||
        left.code.localeCompare(right.code),
    )
    .slice(0, limit)
    .map((airport) => ({
      value: airport.code,
      label: airport.code,
      meta: [airport.name, [airport.city, airport.country].filter(Boolean).join(", ")].filter(Boolean).join(" - "),
    }));
}

function countryMatchRank(country: CountryReference, normalizedQuery: string) {
  if (!normalizedQuery) return 10;
  if (normalize(country.code) === normalizedQuery) return 0;
  if (normalize(country.name) === normalizedQuery) return 1;
  if (normalize(country.name).startsWith(normalizedQuery)) return 2;
  return 10;
}

function airportMatchRank(airport: AirportReference, normalizedQuery: string) {
  if (!normalizedQuery) return 10;
  const code = normalize(airport.code);
  const city = normalize(airport.city);
  const name = normalize(airport.name);
  if (code === normalizedQuery) return 0;
  if (code.startsWith(normalizedQuery)) return 1;
  if (city === normalizedQuery) return 2;
  if (city.startsWith(normalizedQuery)) return 3;
  if (name.startsWith(normalizedQuery)) return 4;
  return 10;
}

function getPreferredCountryContext(preferredCountry?: string) {
  if (!preferredCountry) return 10;
  const preferred = normalize(preferredCountry);
  const country = countries.find((item) => normalize(item.name) === preferred || normalize(item.code) === preferred);
  if (!country) return { countryCode: preferredCountry, borders: new Set<string>(), region: undefined, subregion: undefined };
  return {
    countryCode: country.code,
    countryName: country.name,
    borders: new Set(country.borders ?? []),
    region: country.region,
    subregion: country.subregion,
  };
}

function countryPriority(country: CountryReference, preferredContext: ReturnType<typeof getPreferredCountryContext>) {
  if (preferredContext === 10) return 10;
  if (country.code === preferredContext.countryCode || country.name === preferredContext.countryName) return 0;
  if (preferredContext.borders.has(country.code)) return 1;
  if (country.subregion && country.subregion === preferredContext.subregion) return 2;
  if (country.region && country.region === preferredContext.region) return 3;
  return 10;
}

function airportCountryPriority(airport: AirportReference, preferredContext: ReturnType<typeof getPreferredCountryContext>) {
  if (preferredContext === 10) return 10;
  if (airport.countryCode === preferredContext.countryCode || airport.country === preferredContext.countryName) return 0;
  if (preferredContext.borders.has(airport.countryCode)) return 1;
  return 10;
}

function normalize(value: string | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
