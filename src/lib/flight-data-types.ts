import { realGsaFlightPartners } from "@/lib/real-gsa-data";

export type AirportPoint = {
  airportCode: string;
  airportName: string;
  countryCode: string;
  lat: number;
  lng: number;
};

export type CargoDestination = {
  city: string;
  countryCode: string;
  percentage: number;
};

export type ProductMix = {
  generalCargo?: number;
  pharma?: number;
  avi?: number;
  dangerousGoods?: number;
  perishables?: number;
  express?: number;
  ecommerce?: number;
  highValue?: number;
  seafood?: number;
  automotive?: number;
};

export type FlightTrackerRecord = {
  id: string;
  flightNumber: string;
  airlineName: string;
  airlineColor: string;
  gsaName: string;
  gsaColor: string;
  origin: AirportPoint;
  destination: AirportPoint;
  currentPosition: {
    lat: number;
    lng: number;
  };
  track?: number;
  altitude?: number;
  gspeed?: number;
  registration?: string;
  aircraftType?: string;
  flightType: "freighter" | "belly";
  commercialDataSource?: "operational" | "unavailable";
  tonnage: number;
  loadFactor: number;
  revenue: number;
  averageYield: number;
  products: ProductMix;
  soldBy: "airline" | "gsa";
  salesTeam: string;
  responsibleGsa: string;
  cargoDestinations: CargoDestination[];
};

export type LandedAirportCluster = {
  airport: AirportPoint;
  flights: {
    id: string;
    flightNumber: string;
    registration?: string;
    aircraftType?: string;
    flightType: "freighter" | "belly";
    origin?: AirportPoint;
    landedAt?: string;
  }[];
};

export const airlineBrands = [
  { name: "Turkish Cargo", color: "#E30613", salesTeams: ["Turkish Cargo Germany", "Turkish Cargo Benelux"] },
  { name: "AeroBridge Cargo", color: "#00AEEF", salesTeams: ["AeroBridge DACH Sales", "AeroBridge Austria Desk"] },
  { name: "NorthStar Airways", color: "#8B5CF6", salesTeams: ["NorthStar Iberia Cargo"] },
  { name: "PolarLine Cargo", color: "#2DD4BF", salesTeams: ["PolarLine Nordics Cargo"] },
] as const;

export const gsaFlightPartners = realGsaFlightPartners;

export function getFlightsForAirline(
  flights: FlightTrackerRecord[],
  filters: { airlineName: string; salesTeams?: string[] },
) {
  return flights.filter((flight) => {
    const belongsToAirline = flight.airlineName === filters.airlineName;
    const handledBySalesTeam = filters.salesTeams?.includes(flight.salesTeam) ?? false;

    return belongsToAirline || handledBySalesTeam;
  });
}

export function getFlightsForGsa(flights: FlightTrackerRecord[], filters: { gsaName: string }) {
  return flights.filter((flight) => flight.gsaName === filters.gsaName || flight.responsibleGsa === filters.gsaName);
}
