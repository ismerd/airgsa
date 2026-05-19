import type { AirportPoint } from "@/lib/flight-data-types";
import { realGsaFlightPartners } from "@/lib/real-gsa-data";

export const SAUDIA_CARGO = {
  name: "Saudia Cargo",
  color: "#006241", // Saudia green
  iata: "SV",
  icao: "SVA",
  hub: "JED",
  secondaryHub: "RUH",
} as const;

// GSA partners assigned to Saudia Cargo routes
export const SAUDIA_GSA_PARTNERS = [
  ...realGsaFlightPartners,
] as const;

// Key airports in Saudia Cargo's network (exported for FR24 enrichment)
export const AIRPORTS: Record<string, AirportPoint> = {
  JED: { airportCode: "JED", airportName: "King Abdulaziz International Airport", countryCode: "SA", lat: 21.6705, lng: 39.1728 },
  RUH: { airportCode: "RUH", airportName: "King Khalid International Airport", countryCode: "SA", lat: 24.9576, lng: 46.6988 },
  MED: { airportCode: "MED", airportName: "Prince Mohammad Bin Abdulaziz Airport", countryCode: "SA", lat: 24.5534, lng: 39.7051 },
  FRA: { airportCode: "FRA", airportName: "Frankfurt Airport", countryCode: "DE", lat: 50.0379, lng: 8.5622 },
  MUC: { airportCode: "MUC", airportName: "Munich Airport", countryCode: "DE", lat: 48.3538, lng: 11.7861 },
  LHR: { airportCode: "LHR", airportName: "London Heathrow Airport", countryCode: "GB", lat: 51.4700, lng: -0.4543 },
  CDG: { airportCode: "CDG", airportName: "Paris Charles de Gaulle Airport", countryCode: "FR", lat: 49.0097, lng: 2.5479 },
  AMS: { airportCode: "AMS", airportName: "Amsterdam Schiphol Airport", countryCode: "NL", lat: 52.3086, lng: 4.7639 },
  LGG: { airportCode: "LGG", airportName: "Liege Airport", countryCode: "BE", lat: 50.6374, lng: 5.4432 },
  BRU: { airportCode: "BRU", airportName: "Brussels Airport", countryCode: "BE", lat: 50.9010, lng: 4.4844 },
  ZRH: { airportCode: "ZRH", airportName: "Zurich Airport", countryCode: "CH", lat: 47.4647, lng: 8.5492 },
  MAD: { airportCode: "MAD", airportName: "Madrid Barajas Airport", countryCode: "ES", lat: 40.4936, lng: -3.5668 },
  FCO: { airportCode: "FCO", airportName: "Rome Fiumicino Airport", countryCode: "IT", lat: 41.8003, lng: 12.2389 },
  IST: { airportCode: "IST", airportName: "Istanbul Airport", countryCode: "TR", lat: 41.2608, lng: 28.7418 },
  CAI: { airportCode: "CAI", airportName: "Cairo International Airport", countryCode: "EG", lat: 30.1219, lng: 31.4056 },
  CMN: { airportCode: "CMN", airportName: "Mohammed V International Airport", countryCode: "MA", lat: 33.3675, lng: -7.58997 },
  JFK: { airportCode: "JFK", airportName: "John F. Kennedy International Airport", countryCode: "US", lat: 40.6413, lng: -73.7781 },
  ORD: { airportCode: "ORD", airportName: "Chicago O'Hare International Airport", countryCode: "US", lat: 41.9742, lng: -87.9073 },
  LAX: { airportCode: "LAX", airportName: "Los Angeles International Airport", countryCode: "US", lat: 33.9425, lng: -118.4081 },
  HKG: { airportCode: "HKG", airportName: "Hong Kong International Airport", countryCode: "HK", lat: 22.3080, lng: 113.9185 },
  SZX: { airportCode: "SZX", airportName: "Shenzhen Bao'an International Airport", countryCode: "CN", lat: 22.6393, lng: 113.8107 },
  SIN: { airportCode: "SIN", airportName: "Singapore Changi Airport", countryCode: "SG", lat: 1.3644, lng: 103.9915 },
  NRT: { airportCode: "NRT", airportName: "Tokyo Narita International Airport", countryCode: "JP", lat: 35.7720, lng: 140.3929 },
  PVG: { airportCode: "PVG", airportName: "Shanghai Pudong International Airport", countryCode: "CN", lat: 31.1443, lng: 121.8083 },
  PEK: { airportCode: "PEK", airportName: "Beijing Capital International Airport", countryCode: "CN", lat: 40.0799, lng: 116.6031 },
  BOM: { airportCode: "BOM", airportName: "Chhatrapati Shivaji Maharaj International Airport", countryCode: "IN", lat: 19.0896, lng: 72.8656 },
  DEL: { airportCode: "DEL", airportName: "Indira Gandhi International Airport", countryCode: "IN", lat: 28.5562, lng: 77.1000 },
  HYD: { airportCode: "HYD", airportName: "Rajiv Gandhi International Airport", countryCode: "IN", lat: 17.2403, lng: 78.4294 },
  COK: { airportCode: "COK", airportName: "Cochin International Airport", countryCode: "IN", lat: 10.1520, lng: 76.4019 },
  BLR: { airportCode: "BLR", airportName: "Kempegowda International Airport", countryCode: "IN", lat: 13.1986, lng: 77.7066 },
  CGO: { airportCode: "CGO", airportName: "Zhengzhou Xinzheng International Airport", countryCode: "CN", lat: 34.5197, lng: 113.8408 },
  CAN: { airportCode: "CAN", airportName: "Guangzhou Baiyun International Airport", countryCode: "CN", lat: 23.3924, lng: 113.2988 },
  DOH: { airportCode: "DOH", airportName: "Hamad International Airport", countryCode: "QA", lat: 25.2731, lng: 51.6081 },
  DXB: { airportCode: "DXB", airportName: "Dubai International Airport", countryCode: "AE", lat: 25.2532, lng: 55.3657 },
  AUH: { airportCode: "AUH", airportName: "Abu Dhabi International Airport", countryCode: "AE", lat: 24.4330, lng: 54.6511 },
  KWI: { airportCode: "KWI", airportName: "Kuwait International Airport", countryCode: "KW", lat: 29.2267, lng: 47.9689 },
  BAH: { airportCode: "BAH", airportName: "Bahrain International Airport", countryCode: "BH", lat: 26.2708, lng: 50.6336 },
  MCT: { airportCode: "MCT", airportName: "Muscat International Airport", countryCode: "OM", lat: 23.5931, lng: 58.2844 },
  AMM: { airportCode: "AMM", airportName: "Queen Alia International Airport", countryCode: "JO", lat: 31.7226, lng: 35.9932 },
  BEY: { airportCode: "BEY", airportName: "Beirut Rafic Hariri International Airport", countryCode: "LB", lat: 33.8209, lng: 35.4883 },
  KHI: { airportCode: "KHI", airportName: "Jinnah International Airport", countryCode: "PK", lat: 24.9065, lng: 67.1608 },
  ISB: { airportCode: "ISB", airportName: "Islamabad International Airport", countryCode: "PK", lat: 33.5607, lng: 72.8516 },
  PEW: { airportCode: "PEW", airportName: "Bacha Khan International Airport", countryCode: "PK", lat: 33.9939, lng: 71.5146 },
  DAC: { airportCode: "DAC", airportName: "Hazrat Shahjalal International Airport", countryCode: "BD", lat: 23.8433, lng: 90.3978 },
  CMB: { airportCode: "CMB", airportName: "Bandaranaike International Airport", countryCode: "LK", lat: 7.1808, lng: 79.8841 },
  BKK: { airportCode: "BKK", airportName: "Suvarnabhumi Airport", countryCode: "TH", lat: 13.6900, lng: 100.7501 },
  KUL: { airportCode: "KUL", airportName: "Kuala Lumpur International Airport", countryCode: "MY", lat: 2.7456, lng: 101.7099 },
  CGK: { airportCode: "CGK", airportName: "Soekarno–Hatta International Airport", countryCode: "ID", lat: -6.1256, lng: 106.6559 },
  MNL: { airportCode: "MNL", airportName: "Ninoy Aquino International Airport", countryCode: "PH", lat: 14.5086, lng: 121.0194 },
  NBO: { airportCode: "NBO", airportName: "Jomo Kenyatta International Airport", countryCode: "KE", lat: -1.3192, lng: 36.9275 },
  ADD: { airportCode: "ADD", airportName: "Addis Ababa Bole International Airport", countryCode: "ET", lat: 8.9779, lng: 38.7993 },
  LOS: { airportCode: "LOS", airportName: "Murtala Muhammed International Airport", countryCode: "NG", lat: 6.5774, lng: 3.3214 },
  ACC: { airportCode: "ACC", airportName: "Kotoka International Airport", countryCode: "GH", lat: 5.6052, lng: -0.1668 },
  JNB: { airportCode: "JNB", airportName: "O.R. Tambo International Airport", countryCode: "ZA", lat: -26.1367, lng: 28.2411 },
  TLV: { airportCode: "TLV", airportName: "Ben Gurion International Airport", countryCode: "IL", lat: 32.0114, lng: 34.8867 },
  ATH: { airportCode: "ATH", airportName: "Athens International Airport", countryCode: "GR", lat: 37.9364, lng: 23.9445 },
  VIE: { airportCode: "VIE", airportName: "Vienna International Airport", countryCode: "AT", lat: 48.1103, lng: 16.5697 },
  MXP: { airportCode: "MXP", airportName: "Milan Malpensa Airport", countryCode: "IT", lat: 45.6306, lng: 8.7281 },
  BCN: { airportCode: "BCN", airportName: "Barcelona El Prat Airport", countryCode: "ES", lat: 41.2974, lng: 2.0833 },
  GVA: { airportCode: "GVA", airportName: "Geneva Airport", countryCode: "CH", lat: 46.2381, lng: 6.1089 },
};

// ICAO → IATA lookup for FR24 flight-summary enrichment
export const ICAO_TO_IATA: Record<string, string> = {
  // Saudi Arabia
  OEJN: "JED", OERK: "RUH", OEMA: "MED",
  // Germany / Austria
  EDDF: "FRA", EDDM: "MUC", LOWW: "VIE",
  // Western Europe
  EGLL: "LHR", LFPG: "CDG", EHAM: "AMS",
  EBBR: "BRU", EBLG: "LGG", LSZH: "ZRH", LSGG: "GVA",
  LEMD: "MAD", LEBL: "BCN",
  LIRF: "FCO", LIMC: "MXP",
  LGAV: "ATH",
  // Turkey / Middle East
  LTFM: "IST", HECA: "CAI", GMMN: "CMN",
  OOMS: "MCT", OJAI: "AMM", OLBA: "BEY",
  LLBG: "TLV",
  // Gulf
  OTHH: "DOH", OMDB: "DXB", OMAA: "AUH",
  OKBK: "KWI", OBBI: "BAH",
  // South Asia
  VABB: "BOM", VIDP: "DEL", VOHS: "HYD", VOCI: "COK", VOBL: "BLR",
  OPKC: "KHI", OPIS: "ISB", OPPS: "PEW",
  VGZR: "DAC", VGHS: "DAC",
  VCBI: "CMB",
  // Southeast Asia
  VTBS: "BKK", VTBD: "BKK",
  WMKK: "KUL",
  WIII: "CGK",
  RPLL: "MNL",
  // East Asia
  VHHH: "HKG", ZGSZ: "SZX", WSSS: "SIN", RJAA: "NRT",
  ZSPD: "PVG", ZBAA: "PEK",
  ZHCC: "CGO", ZGGG: "CAN",
  // Americas
  KJFK: "JFK", KORD: "ORD", KLAX: "LAX",
  // Africa
  HKJK: "NBO", HAAB: "ADD",
  DNMM: "LOS", DGAA: "ACC",
  FAOR: "JNB",
};

// Known Saudia Cargo routes — used as enrichment hint when flight-summary
// doesn't return origin/destination (e.g. flight just departed, no summary yet)
export const FLIGHT_ROUTE_LOOKUP: Record<string, { origin: string; destination: string }> = {
  SV803: { origin: "JED", destination: "FRA" },
  SV804: { origin: "FRA", destination: "JED" },
  SV805: { origin: "JED", destination: "LHR" },
  SV806: { origin: "LHR", destination: "JED" },
  SV807: { origin: "JED", destination: "CDG" },
  SV808: { origin: "CDG", destination: "JED" },
  SV809: { origin: "JED", destination: "JFK" },
  SV810: { origin: "JFK", destination: "JED" },
  SV811: { origin: "JED", destination: "ORD" },
  SV812: { origin: "ORD", destination: "JED" },
  SV813: { origin: "JED", destination: "HKG" },
  SV814: { origin: "HKG", destination: "JED" },
  SV815: { origin: "JED", destination: "NRT" },
  SV816: { origin: "NRT", destination: "JED" },
  SV817: { origin: "JED", destination: "BOM" },
  SV818: { origin: "BOM", destination: "JED" },
  SV819: { origin: "RUH", destination: "FRA" },
  SV820: { origin: "FRA", destination: "RUH" },
  SV821: { origin: "JED", destination: "CGO" },
  SV822: { origin: "CGO", destination: "JED" },
  SV823: { origin: "JED", destination: "SIN" },
  SV824: { origin: "SIN", destination: "JED" },
};
