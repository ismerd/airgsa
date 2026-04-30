export type AirportPoint = {
  airportCode: string;
  airportName: string;
  lat: number;
  lng: number;
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
  tonnage: number;
  loadFactor: number;
  revenue: number;
  averageYield: number;
  products: ProductMix;
  soldBy: "airline" | "gsa";
  salesTeam: string;
  responsibleGsa: string;
};

export const airlineBrands = [
  { name: "Turkish Cargo", color: "#E30613", salesTeams: ["Turkish Cargo Germany", "Turkish Cargo Benelux"] },
  { name: "AeroBridge Cargo", color: "#00AEEF", salesTeams: ["AeroBridge DACH Sales", "AeroBridge Austria Desk"] },
  { name: "NorthStar Airways", color: "#8B5CF6", salesTeams: ["NorthStar Iberia Cargo"] },
  { name: "PolarLine Cargo", color: "#2DD4BF", salesTeams: ["PolarLine Nordics Cargo"] },
] as const;

export const gsaFlightPartners = [
  { name: "BlueWing Cargo Solutions", color: "#0066CC" },
  { name: "Atlantic AirCargo Partners", color: "#F97316" },
  { name: "NordicLift Aviation Services", color: "#22C55E" },
] as const;

export const dummyFlights: FlightTrackerRecord[] = [
  {
    id: "flight-001",
    flightNumber: "TKC403",
    airlineName: "Turkish Cargo",
    airlineColor: "#E30613",
    gsaName: "BlueWing Cargo Solutions",
    gsaColor: "#0066CC",
    origin: { airportCode: "IST", airportName: "Istanbul Airport", lat: 41.2753, lng: 28.7519 },
    destination: { airportCode: "FRA", airportName: "Frankfurt Airport", lat: 50.0379, lng: 8.5622 },
    currentPosition: { lat: 46.5, lng: 18.2 },
    tonnage: 18.4,
    loadFactor: 82,
    revenue: 42500,
    averageYield: 2.31,
    products: { generalCargo: 55, pharma: 25, avi: 10, perishables: 10 },
    soldBy: "gsa",
    salesTeam: "Turkish Cargo Germany",
    responsibleGsa: "BlueWing Cargo Solutions",
  },
  {
    id: "flight-002",
    flightNumber: "TKC711",
    airlineName: "Turkish Cargo",
    airlineColor: "#E30613",
    gsaName: "Atlantic AirCargo Partners",
    gsaColor: "#F97316",
    origin: { airportCode: "IST", airportName: "Istanbul Airport", lat: 41.2753, lng: 28.7519 },
    destination: { airportCode: "MAD", airportName: "Adolfo Suarez Madrid-Barajas", lat: 40.4983, lng: -3.5676 },
    currentPosition: { lat: 41.3, lng: 9.6 },
    tonnage: 14.2,
    loadFactor: 76,
    revenue: 33100,
    averageYield: 2.33,
    products: { generalCargo: 42, pharma: 18, perishables: 25, dangerousGoods: 15 },
    soldBy: "gsa",
    salesTeam: "Turkish Cargo Benelux",
    responsibleGsa: "Atlantic AirCargo Partners",
  },
  {
    id: "flight-003",
    flightNumber: "ABR214",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "BlueWing Cargo Solutions",
    gsaColor: "#0066CC",
    origin: { airportCode: "FRA", airportName: "Frankfurt Airport", lat: 50.0379, lng: 8.5622 },
    destination: { airportCode: "DXB", airportName: "Dubai International Airport", lat: 25.2532, lng: 55.3657 },
    currentPosition: { lat: 39.2, lng: 34.8 },
    tonnage: 21.6,
    loadFactor: 88,
    revenue: 61200,
    averageYield: 2.83,
    products: { generalCargo: 35, pharma: 30, automotive: 20, express: 15 },
    soldBy: "airline",
    salesTeam: "AeroBridge DACH Sales",
    responsibleGsa: "BlueWing Cargo Solutions",
  },
  {
    id: "flight-004",
    flightNumber: "ABR601",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "BlueWing Cargo Solutions",
    gsaColor: "#0066CC",
    origin: { airportCode: "MUC", airportName: "Munich Airport", lat: 48.3538, lng: 11.7861 },
    destination: { airportCode: "SIN", airportName: "Singapore Changi Airport", lat: 1.3644, lng: 103.9915 },
    currentPosition: { lat: 28.4, lng: 61.2 },
    tonnage: 17.9,
    loadFactor: 81,
    revenue: 54800,
    averageYield: 3.06,
    products: { pharma: 40, highValue: 30, generalCargo: 20, dangerousGoods: 10 },
    soldBy: "gsa",
    salesTeam: "AeroBridge DACH Sales",
    responsibleGsa: "BlueWing Cargo Solutions",
  },
  {
    id: "flight-005",
    flightNumber: "ABR332",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "NordicLift Aviation Services",
    gsaColor: "#22C55E",
    origin: { airportCode: "VIE", airportName: "Vienna International Airport", lat: 48.1103, lng: 16.5697 },
    destination: { airportCode: "DOH", airportName: "Hamad International Airport", lat: 25.2731, lng: 51.6081 },
    currentPosition: { lat: 39.8, lng: 31.9 },
    tonnage: 12.7,
    loadFactor: 69,
    revenue: 28600,
    averageYield: 2.25,
    products: { generalCargo: 48, pharma: 22, express: 20, perishables: 10 },
    soldBy: "airline",
    salesTeam: "AeroBridge Austria Desk",
    responsibleGsa: "NordicLift Aviation Services",
  },
  {
    id: "flight-006",
    flightNumber: "NSA921",
    airlineName: "NorthStar Airways",
    airlineColor: "#8B5CF6",
    gsaName: "Atlantic AirCargo Partners",
    gsaColor: "#F97316",
    origin: { airportCode: "MAD", airportName: "Adolfo Suarez Madrid-Barajas", lat: 40.4983, lng: -3.5676 },
    destination: { airportCode: "JFK", airportName: "John F. Kennedy International Airport", lat: 40.6413, lng: -73.7781 },
    currentPosition: { lat: 43.2, lng: -35.6 },
    tonnage: 15.8,
    loadFactor: 73,
    revenue: 38900,
    averageYield: 2.46,
    products: { perishables: 36, ecommerce: 30, generalCargo: 24, pharma: 10 },
    soldBy: "gsa",
    salesTeam: "NorthStar Iberia Cargo",
    responsibleGsa: "Atlantic AirCargo Partners",
  },
  {
    id: "flight-007",
    flightNumber: "NSA117",
    airlineName: "NorthStar Airways",
    airlineColor: "#8B5CF6",
    gsaName: "Atlantic AirCargo Partners",
    gsaColor: "#F97316",
    origin: { airportCode: "LIS", airportName: "Humberto Delgado Airport", lat: 38.7742, lng: -9.1342 },
    destination: { airportCode: "ORD", airportName: "Chicago O'Hare International Airport", lat: 41.9742, lng: -87.9073 },
    currentPosition: { lat: 45.4, lng: -45.3 },
    tonnage: 11.3,
    loadFactor: 66,
    revenue: 24700,
    averageYield: 2.19,
    products: { generalCargo: 45, ecommerce: 35, perishables: 15, dangerousGoods: 5 },
    soldBy: "gsa",
    salesTeam: "NorthStar Iberia Cargo",
    responsibleGsa: "Atlantic AirCargo Partners",
  },
  {
    id: "flight-008",
    flightNumber: "PLC509",
    airlineName: "PolarLine Cargo",
    airlineColor: "#2DD4BF",
    gsaName: "NordicLift Aviation Services",
    gsaColor: "#22C55E",
    origin: { airportCode: "OSL", airportName: "Oslo Gardermoen Airport", lat: 60.1976, lng: 11.1004 },
    destination: { airportCode: "ICN", airportName: "Incheon International Airport", lat: 37.4602, lng: 126.4407 },
    currentPosition: { lat: 55.8, lng: 67.4 },
    tonnage: 19.1,
    loadFactor: 84,
    revenue: 57400,
    averageYield: 3.01,
    products: { seafood: 44, highValue: 26, generalCargo: 20, pharma: 10 },
    soldBy: "gsa",
    salesTeam: "PolarLine Nordics Cargo",
    responsibleGsa: "NordicLift Aviation Services",
  },
  {
    id: "flight-009",
    flightNumber: "PLC778",
    airlineName: "PolarLine Cargo",
    airlineColor: "#2DD4BF",
    gsaName: "NordicLift Aviation Services",
    gsaColor: "#22C55E",
    origin: { airportCode: "CPH", airportName: "Copenhagen Airport", lat: 55.6181, lng: 12.6561 },
    destination: { airportCode: "PVG", airportName: "Shanghai Pudong International Airport", lat: 31.1443, lng: 121.8083 },
    currentPosition: { lat: 49.1, lng: 73.8 },
    tonnage: 16.4,
    loadFactor: 79,
    revenue: 46600,
    averageYield: 2.84,
    products: { seafood: 35, highValue: 30, ecommerce: 20, generalCargo: 15 },
    soldBy: "airline",
    salesTeam: "PolarLine Nordics Cargo",
    responsibleGsa: "NordicLift Aviation Services",
  },
  {
    id: "flight-010",
    flightNumber: "ABR744",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "Atlantic AirCargo Partners",
    gsaColor: "#F97316",
    origin: { airportCode: "BCN", airportName: "Barcelona-El Prat Airport", lat: 41.2974, lng: 2.0833 },
    destination: { airportCode: "MEX", airportName: "Mexico City International Airport", lat: 19.4361, lng: -99.0719 },
    currentPosition: { lat: 31.4, lng: -48.9 },
    tonnage: 13.6,
    loadFactor: 71,
    revenue: 31800,
    averageYield: 2.34,
    products: { generalCargo: 40, perishables: 32, ecommerce: 18, pharma: 10 },
    soldBy: "gsa",
    salesTeam: "AeroBridge DACH Sales",
    responsibleGsa: "Atlantic AirCargo Partners",
  },
];

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
