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
  // Live telemetry from FR24 (undefined when using fallback data)
  track?: number;        // true heading 0–360°
  altitude?: number;     // ft AMSL
  gspeed?: number;       // knots
  registration?: string; // e.g. HZ-AI1
  aircraftType?: string; // ICAO type code, e.g. B77F, B748
  flightType: "freighter" | "belly"; // dedicated freighter or belly-cargo passenger aircraft
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

const baseDummyFlights: FlightTrackerRecord[] = [
  {
    id: "flight-001",
    flightNumber: "TKC403",
    airlineName: "Turkish Cargo",
    airlineColor: "#E30613",
    gsaName: "AEB",
    gsaColor: "#0066CC",
    origin: { airportCode: "IST", airportName: "Istanbul Airport", countryCode: "TR", lat: 41.2753, lng: 28.7519 },
    destination: { airportCode: "FRA", airportName: "Frankfurt Airport", countryCode: "DE", lat: 50.0379, lng: 8.5622 },
    currentPosition: { lat: 46.5, lng: 18.2 },
    tonnage: 18.4,
    loadFactor: 82,
    revenue: 42500,
    averageYield: 2.31,
    products: { generalCargo: 55, pharma: 25, avi: 10, perishables: 10 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "Turkish Cargo Germany",
    responsibleGsa: "AEB",
    cargoDestinations: [
      { city: "Frankfurt", countryCode: "DE", percentage: 35 },
      { city: "Berlin", countryCode: "DE", percentage: 25 },
      { city: "Munich", countryCode: "DE", percentage: 22 },
      { city: "Hamburg", countryCode: "DE", percentage: 18 },
    ],
  },
  {
    id: "flight-002",
    flightNumber: "TKC711",
    airlineName: "Turkish Cargo",
    airlineColor: "#E30613",
    gsaName: "Cargo Airlines Services SAS",
    gsaColor: "#F97316",
    origin: { airportCode: "IST", airportName: "Istanbul Airport", countryCode: "TR", lat: 41.2753, lng: 28.7519 },
    destination: { airportCode: "MAD", airportName: "Adolfo Suarez Madrid-Barajas", countryCode: "ES", lat: 40.4983, lng: -3.5676 },
    currentPosition: { lat: 41.3, lng: 9.6 },
    tonnage: 14.2,
    loadFactor: 76,
    revenue: 33100,
    averageYield: 2.33,
    products: { generalCargo: 42, pharma: 18, perishables: 25, dangerousGoods: 15 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "Turkish Cargo Benelux",
    responsibleGsa: "Cargo Airlines Services SAS",
    cargoDestinations: [
      { city: "Madrid", countryCode: "ES", percentage: 42 },
      { city: "Barcelona", countryCode: "ES", percentage: 28 },
      { city: "Valencia", countryCode: "ES", percentage: 18 },
      { city: "Seville", countryCode: "ES", percentage: 12 },
    ],
  },
  {
    id: "flight-003",
    flightNumber: "ABR214",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "AEB",
    gsaColor: "#0066CC",
    origin: { airportCode: "FRA", airportName: "Frankfurt Airport", countryCode: "DE", lat: 50.0379, lng: 8.5622 },
    destination: { airportCode: "DXB", airportName: "Dubai International Airport", countryCode: "AE", lat: 25.2532, lng: 55.3657 },
    currentPosition: { lat: 39.2, lng: 34.8 },
    tonnage: 21.6,
    loadFactor: 88,
    revenue: 61200,
    averageYield: 2.83,
    products: { generalCargo: 35, pharma: 30, automotive: 20, express: 15 },
    flightType: "belly",
    soldBy: "airline",
    salesTeam: "AeroBridge DACH Sales",
    responsibleGsa: "AEB",
    cargoDestinations: [
      { city: "Dubai", countryCode: "AE", percentage: 45 },
      { city: "Abu Dhabi", countryCode: "AE", percentage: 25 },
      { city: "Riyadh", countryCode: "SA", percentage: 20 },
      { city: "Doha", countryCode: "QA", percentage: 10 },
    ],
  },
  {
    id: "flight-004",
    flightNumber: "ABR601",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "AEB",
    gsaColor: "#0066CC",
    origin: { airportCode: "MUC", airportName: "Munich Airport", countryCode: "DE", lat: 48.3538, lng: 11.7861 },
    destination: { airportCode: "SIN", airportName: "Singapore Changi Airport", countryCode: "SG", lat: 1.3644, lng: 103.9915 },
    currentPosition: { lat: 28.4, lng: 61.2 },
    tonnage: 17.9,
    loadFactor: 81,
    revenue: 54800,
    averageYield: 3.06,
    products: { pharma: 40, highValue: 30, generalCargo: 20, dangerousGoods: 10 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "AeroBridge DACH Sales",
    responsibleGsa: "AEB",
    cargoDestinations: [
      { city: "Singapore", countryCode: "SG", percentage: 50 },
      { city: "Kuala Lumpur", countryCode: "MY", percentage: 25 },
      { city: "Jakarta", countryCode: "ID", percentage: 15 },
      { city: "Bangkok", countryCode: "TH", percentage: 10 },
    ],
  },
  {
    id: "flight-005",
    flightNumber: "ABR332",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "Air Business",
    gsaColor: "#22C55E",
    origin: { airportCode: "VIE", airportName: "Vienna International Airport", countryCode: "AT", lat: 48.1103, lng: 16.5697 },
    destination: { airportCode: "DOH", airportName: "Hamad International Airport", countryCode: "QA", lat: 25.2731, lng: 51.6081 },
    currentPosition: { lat: 39.8, lng: 31.9 },
    tonnage: 12.7,
    loadFactor: 69,
    revenue: 28600,
    averageYield: 2.25,
    products: { generalCargo: 48, pharma: 22, express: 20, perishables: 10 },
    flightType: "belly",
    soldBy: "airline",
    salesTeam: "AeroBridge Austria Desk",
    responsibleGsa: "Air Business",
    cargoDestinations: [
      { city: "Doha", countryCode: "QA", percentage: 55 },
      { city: "Kuwait City", countryCode: "KW", percentage: 20 },
      { city: "Riyadh", countryCode: "SA", percentage: 15 },
      { city: "Manama", countryCode: "BH", percentage: 10 },
    ],
  },
  {
    id: "flight-006",
    flightNumber: "NSA921",
    airlineName: "NorthStar Airways",
    airlineColor: "#8B5CF6",
    gsaName: "Cargo Airlines Services SAS",
    gsaColor: "#F97316",
    origin: { airportCode: "MAD", airportName: "Adolfo Suarez Madrid-Barajas", countryCode: "ES", lat: 40.4983, lng: -3.5676 },
    destination: { airportCode: "JFK", airportName: "John F. Kennedy International Airport", countryCode: "US", lat: 40.6413, lng: -73.7781 },
    currentPosition: { lat: 43.2, lng: -35.6 },
    tonnage: 15.8,
    loadFactor: 73,
    revenue: 38900,
    averageYield: 2.46,
    products: { perishables: 36, ecommerce: 30, generalCargo: 24, pharma: 10 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "NorthStar Iberia Cargo",
    responsibleGsa: "Cargo Airlines Services SAS",
    cargoDestinations: [
      { city: "New York", countryCode: "US", percentage: 45 },
      { city: "Miami", countryCode: "US", percentage: 25 },
      { city: "Boston", countryCode: "US", percentage: 20 },
      { city: "Philadelphia", countryCode: "US", percentage: 10 },
    ],
  },
  {
    id: "flight-007",
    flightNumber: "NSA117",
    airlineName: "NorthStar Airways",
    airlineColor: "#8B5CF6",
    gsaName: "Cargo Airlines Services SAS",
    gsaColor: "#F97316",
    origin: { airportCode: "LIS", airportName: "Humberto Delgado Airport", countryCode: "PT", lat: 38.7742, lng: -9.1342 },
    destination: { airportCode: "ORD", airportName: "Chicago O'Hare International Airport", countryCode: "US", lat: 41.9742, lng: -87.9073 },
    currentPosition: { lat: 45.4, lng: -45.3 },
    tonnage: 11.3,
    loadFactor: 66,
    revenue: 24700,
    averageYield: 2.19,
    products: { generalCargo: 45, ecommerce: 35, perishables: 15, dangerousGoods: 5 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "NorthStar Iberia Cargo",
    responsibleGsa: "Cargo Airlines Services SAS",
    cargoDestinations: [
      { city: "Chicago", countryCode: "US", percentage: 40 },
      { city: "Detroit", countryCode: "US", percentage: 25 },
      { city: "Milwaukee", countryCode: "US", percentage: 20 },
      { city: "Indianapolis", countryCode: "US", percentage: 15 },
    ],
  },
  {
    id: "flight-008",
    flightNumber: "PLC509",
    airlineName: "PolarLine Cargo",
    airlineColor: "#2DD4BF",
    gsaName: "Air Business",
    gsaColor: "#22C55E",
    origin: { airportCode: "OSL", airportName: "Oslo Gardermoen Airport", countryCode: "NO", lat: 60.1976, lng: 11.1004 },
    destination: { airportCode: "ICN", airportName: "Incheon International Airport", countryCode: "KR", lat: 37.4602, lng: 126.4407 },
    currentPosition: { lat: 55.8, lng: 67.4 },
    tonnage: 19.1,
    loadFactor: 84,
    revenue: 57400,
    averageYield: 3.01,
    products: { seafood: 44, highValue: 26, generalCargo: 20, pharma: 10 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "PolarLine Nordics Cargo",
    responsibleGsa: "Air Business",
    cargoDestinations: [
      { city: "Seoul", countryCode: "KR", percentage: 50 },
      { city: "Busan", countryCode: "KR", percentage: 25 },
      { city: "Tokyo", countryCode: "JP", percentage: 15 },
      { city: "Osaka", countryCode: "JP", percentage: 10 },
    ],
  },
  {
    id: "flight-009",
    flightNumber: "PLC778",
    airlineName: "PolarLine Cargo",
    airlineColor: "#2DD4BF",
    gsaName: "Air Business",
    gsaColor: "#22C55E",
    origin: { airportCode: "CPH", airportName: "Copenhagen Airport", countryCode: "DK", lat: 55.6181, lng: 12.6561 },
    destination: { airportCode: "PVG", airportName: "Shanghai Pudong International Airport", countryCode: "CN", lat: 31.1443, lng: 121.8083 },
    currentPosition: { lat: 49.1, lng: 73.8 },
    tonnage: 16.4,
    loadFactor: 79,
    revenue: 46600,
    averageYield: 2.84,
    products: { seafood: 35, highValue: 30, ecommerce: 20, generalCargo: 15 },
    flightType: "belly",
    soldBy: "airline",
    salesTeam: "PolarLine Nordics Cargo",
    responsibleGsa: "Air Business",
    cargoDestinations: [
      { city: "Shanghai", countryCode: "CN", percentage: 45 },
      { city: "Beijing", countryCode: "CN", percentage: 25 },
      { city: "Guangzhou", countryCode: "CN", percentage: 20 },
      { city: "Shenzhen", countryCode: "CN", percentage: 10 },
    ],
  },
  {
    id: "flight-010",
    flightNumber: "ABR744",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "Cargo Airlines Services SAS",
    gsaColor: "#F97316",
    origin: { airportCode: "BCN", airportName: "Barcelona-El Prat Airport", countryCode: "ES", lat: 41.2974, lng: 2.0833 },
    destination: { airportCode: "MEX", airportName: "Mexico City International Airport", countryCode: "MX", lat: 19.4361, lng: -99.0719 },
    currentPosition: { lat: 31.4, lng: -48.9 },
    tonnage: 13.6,
    loadFactor: 71,
    revenue: 31800,
    averageYield: 2.34,
    products: { generalCargo: 40, perishables: 32, ecommerce: 18, pharma: 10 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "AeroBridge DACH Sales",
    responsibleGsa: "Cargo Airlines Services SAS",
    cargoDestinations: [
      { city: "Mexico City", countryCode: "MX", percentage: 50 },
      { city: "Guadalajara", countryCode: "MX", percentage: 25 },
      { city: "Monterrey", countryCode: "MX", percentage: 15 },
      { city: "Bogotá", countryCode: "CO", percentage: 10 },
    ],
  },
  {
    id: "flight-011",
    flightNumber: "TKC520",
    airlineName: "Turkish Cargo",
    airlineColor: "#E30613",
    gsaName: "AEB",
    gsaColor: "#0066CC",
    origin: { airportCode: "IST", airportName: "Istanbul Airport", countryCode: "TR", lat: 41.2753, lng: 28.7519 },
    destination: { airportCode: "LHR", airportName: "London Heathrow Airport", countryCode: "GB", lat: 51.4700, lng: -0.4543 },
    currentPosition: { lat: 45.8, lng: 16.2 },
    tonnage: 16.2,
    loadFactor: 78,
    revenue: 38400,
    averageYield: 2.37,
    products: { generalCargo: 45, pharma: 20, express: 20, perishables: 15 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "Turkish Cargo Germany",
    responsibleGsa: "AEB",
    cargoDestinations: [
      { city: "London", countryCode: "GB", percentage: 40 },
      { city: "Manchester", countryCode: "GB", percentage: 25 },
      { city: "Birmingham", countryCode: "GB", percentage: 20 },
      { city: "Leeds", countryCode: "GB", percentage: 15 },
    ],
  },
  {
    id: "flight-012",
    flightNumber: "ABR890",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "AEB",
    gsaColor: "#0066CC",
    origin: { airportCode: "DXB", airportName: "Dubai International Airport", countryCode: "AE", lat: 25.2532, lng: 55.3657 },
    destination: { airportCode: "HKG", airportName: "Hong Kong International Airport", countryCode: "HK", lat: 22.3080, lng: 113.9185 },
    currentPosition: { lat: 22.1, lng: 84.6 },
    tonnage: 22.3,
    loadFactor: 91,
    revenue: 68500,
    averageYield: 3.07,
    products: { highValue: 35, pharma: 28, generalCargo: 22, express: 15 },
    flightType: "belly",
    soldBy: "airline",
    salesTeam: "AeroBridge DACH Sales",
    responsibleGsa: "AEB",
    cargoDestinations: [
      { city: "Hong Kong", countryCode: "HK", percentage: 45 },
      { city: "Shenzhen", countryCode: "CN", percentage: 25 },
      { city: "Guangzhou", countryCode: "CN", percentage: 20 },
      { city: "Macau", countryCode: "MO", percentage: 10 },
    ],
  },
  {
    id: "flight-013",
    flightNumber: "NSA445",
    airlineName: "NorthStar Airways",
    airlineColor: "#8B5CF6",
    gsaName: "Cargo Airlines Services SAS",
    gsaColor: "#F97316",
    origin: { airportCode: "AMS", airportName: "Amsterdam Schiphol Airport", countryCode: "NL", lat: 52.3086, lng: 4.7639 },
    destination: { airportCode: "ORD", airportName: "Chicago O'Hare International Airport", countryCode: "US", lat: 41.9742, lng: -87.9073 },
    currentPosition: { lat: 54.2, lng: -28.5 },
    tonnage: 13.8,
    loadFactor: 71,
    revenue: 35200,
    averageYield: 2.55,
    products: { generalCargo: 38, ecommerce: 32, pharma: 18, highValue: 12 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "NorthStar Iberia Cargo",
    responsibleGsa: "Cargo Airlines Services SAS",
    cargoDestinations: [
      { city: "Chicago", countryCode: "US", percentage: 45 },
      { city: "Minneapolis", countryCode: "US", percentage: 22 },
      { city: "Detroit", countryCode: "US", percentage: 18 },
      { city: "Cleveland", countryCode: "US", percentage: 15 },
    ],
  },
  {
    id: "flight-014",
    flightNumber: "PLC330",
    airlineName: "PolarLine Cargo",
    airlineColor: "#2DD4BF",
    gsaName: "Air Business",
    gsaColor: "#22C55E",
    origin: { airportCode: "HEL", airportName: "Helsinki-Vantaa Airport", countryCode: "FI", lat: 60.3172, lng: 24.9633 },
    destination: { airportCode: "NRT", airportName: "Tokyo Narita International Airport", countryCode: "JP", lat: 35.7720, lng: 140.3929 },
    currentPosition: { lat: 63.1, lng: 98.4 },
    tonnage: 18.5,
    loadFactor: 83,
    revenue: 56200,
    averageYield: 3.04,
    products: { highValue: 38, generalCargo: 28, pharma: 22, automotive: 12 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "PolarLine Nordics Cargo",
    responsibleGsa: "Air Business",
    cargoDestinations: [
      { city: "Tokyo", countryCode: "JP", percentage: 50 },
      { city: "Osaka", countryCode: "JP", percentage: 22 },
      { city: "Nagoya", countryCode: "JP", percentage: 16 },
      { city: "Fukuoka", countryCode: "JP", percentage: 12 },
    ],
  },
  {
    id: "flight-015",
    flightNumber: "TKC688",
    airlineName: "Turkish Cargo",
    airlineColor: "#E30613",
    gsaName: "Cargo Airlines Services SAS",
    gsaColor: "#F97316",
    origin: { airportCode: "IST", airportName: "Istanbul Airport", countryCode: "TR", lat: 41.2753, lng: 28.7519 },
    destination: { airportCode: "JFK", airportName: "John F. Kennedy International Airport", countryCode: "US", lat: 40.6413, lng: -73.7781 },
    currentPosition: { lat: 47.3, lng: -33.8 },
    tonnage: 20.1,
    loadFactor: 86,
    revenue: 58900,
    averageYield: 2.93,
    products: { generalCargo: 40, pharma: 25, highValue: 20, express: 15 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "Turkish Cargo Benelux",
    responsibleGsa: "Cargo Airlines Services SAS",
    cargoDestinations: [
      { city: "New York", countryCode: "US", percentage: 42 },
      { city: "Newark", countryCode: "US", percentage: 25 },
      { city: "Boston", countryCode: "US", percentage: 20 },
      { city: "Providence", countryCode: "US", percentage: 13 },
    ],
  },
  {
    id: "flight-016",
    flightNumber: "ABR175",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "AEB",
    gsaColor: "#0066CC",
    origin: { airportCode: "ZRH", airportName: "Zurich Airport", countryCode: "CH", lat: 47.4647, lng: 8.5492 },
    destination: { airportCode: "PEK", airportName: "Beijing Capital International Airport", countryCode: "CN", lat: 40.0799, lng: 116.6031 },
    currentPosition: { lat: 47.8, lng: 67.5 },
    tonnage: 15.4,
    loadFactor: 74,
    revenue: 47100,
    averageYield: 3.06,
    products: { pharma: 42, highValue: 28, generalCargo: 20, automotive: 10 },
    flightType: "belly",
    soldBy: "airline",
    salesTeam: "AeroBridge DACH Sales",
    responsibleGsa: "AEB",
    cargoDestinations: [
      { city: "Beijing", countryCode: "CN", percentage: 48 },
      { city: "Tianjin", countryCode: "CN", percentage: 26 },
      { city: "Shenyang", countryCode: "CN", percentage: 16 },
      { city: "Dalian", countryCode: "CN", percentage: 10 },
    ],
  },
  {
    id: "flight-017",
    flightNumber: "NSA562",
    airlineName: "NorthStar Airways",
    airlineColor: "#8B5CF6",
    gsaName: "Cargo Airlines Services SAS",
    gsaColor: "#F97316",
    origin: { airportCode: "CDG", airportName: "Paris Charles de Gaulle Airport", countryCode: "FR", lat: 49.0097, lng: 2.5479 },
    destination: { airportCode: "GRU", airportName: "São Paulo Guarulhos International Airport", countryCode: "BR", lat: -23.4356, lng: -46.4731 },
    currentPosition: { lat: 7.2, lng: -18.4 },
    tonnage: 14.7,
    loadFactor: 69,
    revenue: 39800,
    averageYield: 2.71,
    products: { perishables: 35, generalCargo: 30, ecommerce: 22, pharma: 13 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "NorthStar Iberia Cargo",
    responsibleGsa: "Cargo Airlines Services SAS",
    cargoDestinations: [
      { city: "São Paulo", countryCode: "BR", percentage: 48 },
      { city: "Rio de Janeiro", countryCode: "BR", percentage: 28 },
      { city: "Belo Horizonte", countryCode: "BR", percentage: 14 },
      { city: "Campinas", countryCode: "BR", percentage: 10 },
    ],
  },
  {
    id: "flight-018",
    flightNumber: "PLC841",
    airlineName: "PolarLine Cargo",
    airlineColor: "#2DD4BF",
    gsaName: "Air Business",
    gsaColor: "#22C55E",
    origin: { airportCode: "ARN", airportName: "Stockholm Arlanda Airport", countryCode: "SE", lat: 59.6519, lng: 17.9186 },
    destination: { airportCode: "LAX", airportName: "Los Angeles International Airport", countryCode: "US", lat: 33.9425, lng: -118.4081 },
    currentPosition: { lat: 68.3, lng: -48.2 },
    tonnage: 11.9,
    loadFactor: 65,
    revenue: 33600,
    averageYield: 2.82,
    products: { highValue: 40, generalCargo: 30, pharma: 18, express: 12 },
    flightType: "belly",
    soldBy: "airline",
    salesTeam: "PolarLine Nordics Cargo",
    responsibleGsa: "Air Business",
    cargoDestinations: [
      { city: "Los Angeles", countryCode: "US", percentage: 50 },
      { city: "San Francisco", countryCode: "US", percentage: 25 },
      { city: "San Diego", countryCode: "US", percentage: 15 },
      { city: "Las Vegas", countryCode: "US", percentage: 10 },
    ],
  },
  {
    id: "flight-019",
    flightNumber: "TKC301",
    airlineName: "Turkish Cargo",
    airlineColor: "#E30613",
    gsaName: "AEB",
    gsaColor: "#0066CC",
    origin: { airportCode: "IST", airportName: "Istanbul Airport", countryCode: "TR", lat: 41.2753, lng: 28.7519 },
    destination: { airportCode: "BOM", airportName: "Chhatrapati Shivaji Maharaj International Airport", countryCode: "IN", lat: 19.0896, lng: 72.8656 },
    currentPosition: { lat: 29.4, lng: 58.7 },
    tonnage: 17.3,
    loadFactor: 80,
    revenue: 44600,
    averageYield: 2.58,
    products: { generalCargo: 44, pharma: 26, perishables: 18, dangerousGoods: 12 },
    flightType: "belly",
    soldBy: "gsa",
    salesTeam: "Turkish Cargo Germany",
    responsibleGsa: "AEB",
    cargoDestinations: [
      { city: "Mumbai", countryCode: "IN", percentage: 45 },
      { city: "Pune", countryCode: "IN", percentage: 22 },
      { city: "Ahmedabad", countryCode: "IN", percentage: 18 },
      { city: "Surat", countryCode: "IN", percentage: 15 },
    ],
  },
  {
    id: "flight-020",
    flightNumber: "ABR455",
    airlineName: "AeroBridge Cargo",
    airlineColor: "#00AEEF",
    gsaName: "Air Business",
    gsaColor: "#22C55E",
    origin: { airportCode: "MUC", airportName: "Munich Airport", countryCode: "DE", lat: 48.3538, lng: 11.7861 },
    destination: { airportCode: "NBO", airportName: "Jomo Kenyatta International Airport", countryCode: "KE", lat: -1.3192, lng: 36.9275 },
    currentPosition: { lat: 19.2, lng: 31.8 },
    tonnage: 12.8,
    loadFactor: 72,
    revenue: 36700,
    averageYield: 2.87,
    products: { generalCargo: 38, pharma: 30, perishables: 22, express: 10 },
    flightType: "belly",
    soldBy: "airline",
    salesTeam: "AeroBridge Austria Desk",
    responsibleGsa: "Air Business",
    cargoDestinations: [
      { city: "Nairobi", countryCode: "KE", percentage: 52 },
      { city: "Kampala", countryCode: "UG", percentage: 20 },
      { city: "Dar es Salaam", countryCode: "TZ", percentage: 16 },
      { city: "Addis Ababa", countryCode: "ET", percentage: 12 },
    ],
  },
];

export const dummyFlights: FlightTrackerRecord[] = baseDummyFlights.map((flight, index) => {
  const partner = realGsaFlightPartners[index % realGsaFlightPartners.length];
  return {
    ...flight,
    gsaName: partner.name,
    gsaColor: partner.color,
    responsibleGsa: partner.name,
  };
});

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
