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
