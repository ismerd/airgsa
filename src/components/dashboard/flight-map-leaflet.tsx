"use client";

import L from "leaflet";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { FlightTrackerRecord } from "@/lib/dummy-flight-data";

type FlightLeafletMapProps = {
  flights: FlightTrackerRecord[];
  selectedFlightId?: string;
  markerColorMode: "airline" | "gsa" | "seller";
  onFlightSelect: (flightId: string) => void;
};


function useDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function FlightLeafletMap({ flights, selectedFlightId, markerColorMode, onFlightSelect }: FlightLeafletMapProps) {
  const isDark = useDarkMode();
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer
      className="flight-map h-full min-h-[560px] w-full"
      center={[31, 20]}
      zoom={2}
      minZoom={2}
      maxZoom={6}
      scrollWheelZoom
      worldCopyJump
    >
      <MapResizeObserver watchKey={selectedFlightId ?? "none"} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
        key={tileUrl}
      />

      {flights.map((flight) => {
        const markerColor = getFlightMarkerColor(flight, markerColorMode);
        const isSelected = flight.id === selectedFlightId;

        return (
          <FlightLayer
            key={flight.id}
            flight={flight}
            isSelected={isSelected}
            markerColor={markerColor}
            onFlightSelect={onFlightSelect}
          />
        );
      })}
    </MapContainer>
  );
}

function MapResizeObserver({ watchKey }: { watchKey: string }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let rafId: number;
    const invalidateMapSize = () => {
      rafId = window.requestAnimationFrame(() => {
        if (map.getContainer().isConnected) {
          map.invalidateSize({ animate: false });
        }
      });
    };
    const observer = new ResizeObserver(invalidateMapSize);

    observer.observe(container);
    invalidateMapSize();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [map, watchKey]);

  return null;
}

function FlightLayer({
  flight,
  isSelected,
  markerColor,
  onFlightSelect,
}: {
  flight: FlightTrackerRecord;
  isSelected: boolean;
  markerColor: string;
  onFlightSelect: (flightId: string) => void;
}) {
  const origin: [number, number] = [flight.origin.lat, flight.origin.lng];
  const current: [number, number] = [flight.currentPosition.lat, flight.currentPosition.lng];
  const dest: [number, number] = [flight.destination.lat, flight.destination.lng];

  // Prefer real heading from FR24; fall back to bearing from current position toward destination
  const heading = flight.track ?? getBearing(current, dest);

  const sameEndpoints = flight.origin.airportCode === flight.destination.airportCode;

  // Great circle arc split at current position
  const flownArc = gcArc(origin, current);
  const remainingArc = sameEndpoints ? [] : gcArc(current, dest);

  const icon = L.divIcon({
    className: "flight-aircraft-marker",
    iconAnchor: [12, 12],
    iconSize: [24, 24],
    html: `<span class="flight-aircraft${isSelected ? " is-selected" : ""}" style="--flight-color:${markerColor}" aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img" focusable="false">
        <g transform="rotate(${heading}, 32, 32)">
          <path class="flight-aircraft-outline" d="M32 3.5c2 0 3.5 1.7 3.5 3.8l.3 20 24.1 9.8c1.3.5 2.1 1.8 2.1 3.2v4.4l-26-5.4.3 13.3 8.8 5.4v3.8L32 58.5l-13.1 3.3V58l8.8-5.4.3-13.3-26 5.4v-4.4c0-1.4.8-2.7 2.1-3.2l24.1-9.8.3-20c0-2.1 1.5-3.8 3.5-3.8Z" />
          <path class="flight-aircraft-body" d="M32 3.5c2 0 3.5 1.7 3.5 3.8l.3 20 24.1 9.8c1.3.5 2.1 1.8 2.1 3.2v4.4l-26-5.4.3 13.3 8.8 5.4v3.8L32 58.5l-13.1 3.3V58l8.8-5.4.3-13.3-26 5.4v-4.4c0-1.4.8-2.7 2.1-3.2l24.1-9.8.3-20c0-2.1 1.5-3.8 3.5-3.8Z" />
        </g>
      </svg>
    </span>`,
  });

  return (
    <>
      {isSelected && (
        <>
          {/* Flown portion: origin → live position (solid) */}
          <Polyline
            pathOptions={{ color: markerColor, opacity: 0.9, weight: 2.5 }}
            positions={flownArc}
          />
          {/* Remaining portion: live position → destination (dashed, faded) */}
          {remainingArc.length > 1 && (
            <Polyline
              pathOptions={{ color: markerColor, opacity: 0.3, weight: 1.5, dashArray: "6 5" }}
              positions={remainingArc}
            />
          )}
          {/* Origin dot */}
          <CircleMarker
            center={origin}
            pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: 0.8, opacity: 0.9, weight: 2 }}
            radius={4}
          />
          {/* Destination dot (open circle) */}
          {!sameEndpoints && (
            <CircleMarker
              center={dest}
              pathOptions={{ color: markerColor, fillColor: "transparent", fillOpacity: 0, opacity: 0.5, weight: 2 }}
              radius={4}
            />
          )}
        </>
      )}
      <Marker
        eventHandlers={{ click: () => onFlightSelect(flight.id) }}
        icon={icon}
        position={current}
      >
        <Tooltip direction="top" offset={[0, -18]} opacity={0.96}>
          <span className="font-semibold">{flight.flightNumber}</span>
          <span className="ml-1 text-slate-500">
            {flight.origin.airportCode}–{flight.destination.airportCode}
          </span>
          {(flight.altitude != null || flight.gspeed != null) && (
            <span className="ml-2 text-slate-400 text-[11px]">
              {flight.altitude != null ? `${(flight.altitude / 1000).toFixed(0)}k ft` : ""}
              {flight.altitude != null && flight.gspeed != null ? " · " : ""}
              {flight.gspeed != null ? `${flight.gspeed} kts` : ""}
            </span>
          )}
        </Tooltip>
      </Marker>
    </>
  );
}

// Spherical interpolation along great circle — produces a curved arc on Mercator maps
function gcArc(from: [number, number], to: [number, number], steps = 48): L.LatLngExpression[] {
  const lat1 = toRadians(from[0]), lon1 = toRadians(from[1]);
  const lat2 = toRadians(to[0]), lon2 = toRadians(to[1]);
  const x1 = Math.cos(lat1) * Math.cos(lon1), y1 = Math.cos(lat1) * Math.sin(lon1), z1 = Math.sin(lat1);
  const x2 = Math.cos(lat2) * Math.cos(lon2), y2 = Math.cos(lat2) * Math.sin(lon2), z2 = Math.sin(lat2);
  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  if (sinOmega < 1e-10) return [from, to];
  const points: L.LatLngExpression[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * omega) / sinOmega;
    const s2 = Math.sin(t * omega) / sinOmega;
    const x = s1 * x1 + s2 * x2, y = s1 * y1 + s2 * y2, z = s1 * z1 + s2 * z2;
    points.push([toDegrees(Math.asin(z)), toDegrees(Math.atan2(y, x))]);
  }
  return points;
}

function getBearing(origin: { lat: number; lng: number } | [number, number], destination: { lat: number; lng: number } | [number, number]) {
  const oLat = Array.isArray(origin) ? origin[0] : origin.lat;
  const oLng = Array.isArray(origin) ? origin[1] : origin.lng;
  const dLat = Array.isArray(destination) ? destination[0] : destination.lat;
  const dLng = Array.isArray(destination) ? destination[1] : destination.lng;
  const lat1 = toRadians(oLat);
  const lat2 = toRadians(dLat);
  const deltaLng = toRadians(dLng - oLng);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function getFlightMarkerColor(flight: FlightTrackerRecord, markerColorMode: "airline" | "gsa" | "seller") {
  if (markerColorMode === "seller") {
    return flight.soldBy === "gsa" ? flight.gsaColor : flight.airlineColor;
  }

  return markerColorMode === "gsa" ? flight.gsaColor : flight.airlineColor;
}
