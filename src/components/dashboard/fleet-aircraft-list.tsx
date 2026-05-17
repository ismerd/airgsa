"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FleetAircraftListItem = {
  registration: string;
  aircraft_type?: string;
  aircraft_model?: string;
  cargo_role: "freighter" | "mixed";
  status: "in_air" | "parked" | "tracking";
  current_fr24_id?: string;
  current_flight_number?: string;
  current_callsign?: string;
  origin_iata?: string;
  origin_icao?: string;
  destination_iata?: string;
  destination_icao?: string;
  parked_airport_iata?: string;
  parked_airport_icao?: string;
  last_altitude?: number;
  last_ground_speed?: number;
  last_seen_live_at?: string;
  updated_at: string;
};

type StatusFilter = "all" | "in_air" | "parked" | "tracking";
type CargoFilter = "all" | "freighter" | "mixed";
type SortKey = "registration" | "aircraft" | "cargo_role" | "status" | "flight" | "route" | "altitude" | "speed" | "updated";
type SortDirection = "asc" | "desc";

type FilterOption<T extends string> = {
  value: T;
  label: string;
  count: number;
};

export function FleetAircraftList({ aircraft }: { aircraft: FleetAircraftListItem[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cargoFilter, setCargoFilter] = useState<CargoFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const statusOptions = useMemo<FilterOption<StatusFilter>[]>(
    () => [
      { value: "all", label: `All (${aircraft.length})`, count: aircraft.length },
      { value: "in_air", label: `Flying (${aircraft.filter((item) => item.status === "in_air").length})`, count: aircraft.filter((item) => item.status === "in_air").length },
      { value: "parked", label: `Landed (${aircraft.filter((item) => item.status === "parked").length})`, count: aircraft.filter((item) => item.status === "parked").length },
      { value: "tracking", label: `Tracking (${aircraft.filter((item) => item.status === "tracking").length})`, count: aircraft.filter((item) => item.status === "tracking").length },
    ],
    [aircraft],
  );

  const cargoOptions = useMemo<FilterOption<CargoFilter>[]>(
    () => [
      { value: "all", label: `All types (${aircraft.length})`, count: aircraft.length },
      { value: "freighter", label: `Cargo (${aircraft.filter((item) => item.cargo_role === "freighter").length})`, count: aircraft.filter((item) => item.cargo_role === "freighter").length },
      { value: "mixed", label: `Mixed aircraft (${aircraft.filter((item) => item.cargo_role === "mixed").length})`, count: aircraft.filter((item) => item.cargo_role === "mixed").length },
    ],
    [aircraft],
  );

  const filteredAircraft = useMemo(() => {
    return [...aircraft]
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => cargoFilter === "all" || item.cargo_role === cargoFilter)
      .sort((left, right) => {
        const result = compareValues(getSortValue(left, sortKey), getSortValue(right, sortKey));
        return sortDirection === "asc" ? result : -result;
      });
  }, [aircraft, cargoFilter, sortDirection, sortKey, statusFilter]);

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "updated" ? "desc" : "asc");
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-brand" />
            Worldmap tracked fleet
            <span className="ml-1 text-sm font-normal text-ink-muted">{filteredAircraft.length} shown</span>
          </CardTitle>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setCargoFilter("all");
              setSortKey("updated");
              setSortDirection("desc");
            }}
            className="rounded-md border border-border-ui bg-surface2 px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterGroup label="Status" options={statusOptions} active={statusFilter} onChange={setStatusFilter} />
          <FilterGroup label="Type" options={cargoOptions} active={cargoFilter} onChange={setCargoFilter} />
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {filteredAircraft.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Plane className="h-9 w-9 text-ink-muted/30" />
            <p className="text-sm font-semibold text-ink">
              {aircraft.length === 0 ? "No aircraft stored yet" : "No aircraft match the current filters"}
            </p>
            <p className="max-w-sm text-xs text-ink-muted">
              {aircraft.length === 0
                ? "Enable FR24 and open the dashboard worldmap. Each live Saudia aircraft with a registration will be stored here once."
                : "Adjust the filters above to show more stored aircraft."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <SortableHeader label="Aircraft" sortKey="aircraft" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Registration" sortKey="registration" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Type" sortKey="cargo_role" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Last flight" sortKey="flight" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Route / parking" sortKey="route" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Altitude" sortKey="altitude" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Speed" sortKey="speed" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Updated" sortKey="updated" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui">
              {filteredAircraft.map((item) => (
                <FleetRow key={item.registration} aircraft={item} />
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: FilterOption<T>[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
      <div className="flex overflow-x-auto rounded-md border border-border-ui bg-surface2 p-0.5 scrollbar-none">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={option.count === 0 && option.value !== "all"}
            className={cn(
              "whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors",
              active === option.value ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              option.count === 0 && option.value !== "all" && "cursor-not-allowed opacity-45 hover:text-ink-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="pb-3 pr-4 text-left">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn("flex items-center gap-1.5 transition-colors hover:text-ink", active && "text-brand")}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

function FleetRow({ aircraft }: { aircraft: FleetAircraftListItem }) {
  const status = getStoredStatus(aircraft);
  const route = getRouteLabel(aircraft);

  return (
    <tr className="align-top text-ink-muted">
      <td className="py-4 pr-4">
        <p className="font-semibold text-ink">{aircraft.aircraft_model ?? aircraft.aircraft_type ?? "Unknown type"}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{aircraft.aircraft_type ?? "No type code"}</p>
      </td>
      <td className="py-4 pr-4">
        <p className="font-mono font-semibold text-ink">{aircraft.registration}</p>
      </td>
      <td className="py-4 pr-4">
        <Badge variant={aircraft.cargo_role === "freighter" ? "default" : "muted"}>
          {aircraft.cargo_role === "freighter" ? "Cargo" : "Mixed aircraft"}
        </Badge>
      </td>
      <td className="py-4 pr-4">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${status.dotClass}`} />
          <Badge variant={status.variant}>{status.label}</Badge>
        </span>
        <p className="mt-1 text-[11px] text-ink-muted">{status.detail}</p>
      </td>
      <td className="py-4 pr-4">
        <p className="font-semibold text-ink">{aircraft.current_flight_number ?? aircraft.current_callsign ?? "Unknown"}</p>
        <p className="text-xs text-ink-muted">{aircraft.current_fr24_id ?? "No FR24 leg id"}</p>
      </td>
      <td className="py-4 pr-4">
        <p className="font-mono text-xs text-ink">{route}</p>
        {aircraft.status === "parked" && (
          <p className="mt-1 text-xs text-ink-muted">
            Landed at {aircraft.parked_airport_iata ?? aircraft.parked_airport_icao ?? "destination"}
          </p>
        )}
      </td>
      <td className="py-4 pr-4">
        <p className="text-ink">{aircraft.last_altitude != null ? `${Math.round(aircraft.last_altitude / 100) * 100} ft` : "- ft"}</p>
      </td>
      <td className="py-4 pr-4">
        <p className="text-ink">{aircraft.last_ground_speed != null ? `${aircraft.last_ground_speed} kts` : "- kts"}</p>
      </td>
      <td className="py-4 text-xs">
        <p className="text-ink-muted">{formatDateTime(aircraft.updated_at)}</p>
        {aircraft.last_seen_live_at && <p className="mt-1 text-ink-muted/70">Live: {formatDateTime(aircraft.last_seen_live_at)}</p>}
      </td>
    </tr>
  );
}

function getStoredStatus(aircraft: FleetAircraftListItem): {
  label: string;
  detail: string;
  dotClass: string;
  variant: "default" | "success" | "warning" | "danger" | "muted";
} {
  if (aircraft.status === "parked") {
    return {
      label: "Landed",
      detail: aircraft.parked_airport_iata ?? aircraft.parked_airport_icao ?? "Last destination",
      dotClass: "bg-amber-400",
      variant: "warning",
    };
  }

  if (aircraft.status === "in_air") {
    return {
      label: "Flying",
      detail: aircraft.destination_iata ? `To ${aircraft.destination_iata}` : "Live worldmap sighting",
      dotClass: "bg-brand animate-pulse",
      variant: "success",
    };
  }

  return {
    label: "Tracking",
    detail: "Stored from FR24",
    dotClass: "bg-ink-muted",
    variant: "muted",
  };
}

function getRouteLabel(aircraft: FleetAircraftListItem) {
  const origin = aircraft.origin_iata ?? aircraft.origin_icao ?? "UNK";
  const destination = aircraft.destination_iata ?? aircraft.destination_icao ?? aircraft.parked_airport_iata ?? aircraft.parked_airport_icao ?? "UNK";
  return `${origin} -> ${destination}`;
}

function getSortValue(aircraft: FleetAircraftListItem, key: SortKey) {
  switch (key) {
    case "registration":
      return aircraft.registration;
    case "aircraft":
      return aircraft.aircraft_model ?? aircraft.aircraft_type ?? "";
    case "cargo_role":
      return aircraft.cargo_role;
    case "status":
      return aircraft.status;
    case "flight":
      return aircraft.current_flight_number ?? aircraft.current_callsign ?? "";
    case "route":
      return getRouteLabel(aircraft);
    case "altitude":
      return aircraft.last_altitude ?? -1;
    case "speed":
      return aircraft.last_ground_speed ?? -1;
    case "updated":
      return Date.parse(aircraft.updated_at) || 0;
  }
}

function compareValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "en", { numeric: true, sensitivity: "base" });
}

function formatDateTime(value: string | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}
