import type { Status } from "./types";

export const AIRLINE_GSA_WORKFLOW_STORAGE_KEY = "airgsa-airline-gsa-workflow-v1";

export type AssignableRoute = {
  id: string;
  origin: string;
  destination: string;
  market: string;
  flightType: "freighter" | "belly";
  weeklyCapacityKg: number;
  priority: "launch" | "growth" | "recovery";
};

export type AssignedGsa = {
  gsaId: string;
  acceptedAt: string;
  routeIds: string[];
};

export type AirlineGsaWorkflowState = {
  applicationStatuses: Record<string, Status>;
  acceptedGsas: Record<string, AssignedGsa>;
};

export const assignableRoutes: AssignableRoute[] = [
  { id: "JED-FRA", origin: "JED", destination: "FRA", market: "DACH", flightType: "freighter", weeklyCapacityKg: 756000, priority: "growth" },
  { id: "JED-MUC", origin: "JED", destination: "MUC", market: "DACH", flightType: "belly", weeklyCapacityKg: 126000, priority: "launch" },
  { id: "RUH-FRA", origin: "RUH", destination: "FRA", market: "DACH", flightType: "freighter", weeklyCapacityKg: 432000, priority: "growth" },
  { id: "JED-LHR", origin: "JED", destination: "LHR", market: "UK", flightType: "freighter", weeklyCapacityKg: 540000, priority: "growth" },
  { id: "RUH-LHR", origin: "RUH", destination: "LHR", market: "UK", flightType: "belly", weeklyCapacityKg: 98000, priority: "launch" },
  { id: "JED-CDG", origin: "JED", destination: "CDG", market: "France", flightType: "freighter", weeklyCapacityKg: 432000, priority: "recovery" },
  { id: "JED-MAD", origin: "JED", destination: "MAD", market: "Iberia", flightType: "belly", weeklyCapacityKg: 112000, priority: "launch" },
  { id: "JED-AMS", origin: "JED", destination: "AMS", market: "Benelux", flightType: "freighter", weeklyCapacityKg: 324000, priority: "growth" },
  { id: "RUH-LGG", origin: "RUH", destination: "LGG", market: "Benelux", flightType: "freighter", weeklyCapacityKg: 324000, priority: "launch" },
  { id: "JED-HKG", origin: "JED", destination: "HKG", market: "Asia", flightType: "freighter", weeklyCapacityKg: 540000, priority: "growth" },
  { id: "JED-SIN", origin: "JED", destination: "SIN", market: "Asia", flightType: "freighter", weeklyCapacityKg: 432000, priority: "growth" },
  { id: "RUH-SZX", origin: "RUH", destination: "SZX", market: "China", flightType: "freighter", weeklyCapacityKg: 324000, priority: "launch" },
  { id: "JED-BOM", origin: "JED", destination: "BOM", market: "India", flightType: "freighter", weeklyCapacityKg: 432000, priority: "growth" },
  { id: "JED-JNB", origin: "JED", destination: "JNB", market: "Africa", flightType: "freighter", weeklyCapacityKg: 216000, priority: "launch" },
];
