"use client";

import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { FlightTrackerRecord } from "@/lib/dummy-flight-data";

type FlightLeafletMapProps = {
  flights: FlightTrackerRecord[];
  selectedFlightId?: string;
  markerColorMode: "airline" | "gsa" | "seller";
  onFlightSelect: (flightId: string) => void;
};

const mapBounds: L.LatLngBoundsExpression = [
  [-58, -135],
  [72, 145],
];

export function FlightLeafletMap({ flights, selectedFlightId, markerColorMode, onFlightSelect }: FlightLeafletMapProps) {
  return (
    <MapContainer
      className="flight-map h-full min-h-[420px] w-full"
      center={[31, 20]}
      zoom={2}
      minZoom={2}
      maxZoom={6}
      maxBounds={mapBounds}
      scrollWheelZoom
      worldCopyJump
    >
      <MapResizeObserver watchKey={selectedFlightId ?? "none"} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
    const invalidateMapSize = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    };
    const observer = new ResizeObserver(invalidateMapSize);

    observer.observe(container);
    invalidateMapSize();

    return () => observer.disconnect();
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
  const heading = getBearing(flight.origin, flight.destination);
  const route: L.LatLngExpression[] = [
    [flight.origin.lat, flight.origin.lng],
    [flight.currentPosition.lat, flight.currentPosition.lng],
    [flight.destination.lat, flight.destination.lng],
  ];
  const icon = L.divIcon({
    className: "flight-aircraft-marker",
    iconAnchor: [17, 17],
    iconSize: [34, 34],
    html: `<span class="flight-aircraft${isSelected ? " is-selected" : ""}" style="--flight-color:${markerColor};--flight-heading:${heading}deg" aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img" focusable="false">
        <path class="flight-aircraft-outline" d="M32 3.5c2 0 3.5 1.7 3.5 3.8l.3 20 24.1 9.8c1.3.5 2.1 1.8 2.1 3.2v4.4l-26-5.4.3 13.3 8.8 5.4v3.8L32 58.5l-13.1 3.3V58l8.8-5.4.3-13.3-26 5.4v-4.4c0-1.4.8-2.7 2.1-3.2l24.1-9.8.3-20c0-2.1 1.5-3.8 3.5-3.8Z" />
        <path class="flight-aircraft-body" d="M32 3.5c2 0 3.5 1.7 3.5 3.8l.3 20 24.1 9.8c1.3.5 2.1 1.8 2.1 3.2v4.4l-26-5.4.3 13.3 8.8 5.4v3.8L32 58.5l-13.1 3.3V58l8.8-5.4.3-13.3-26 5.4v-4.4c0-1.4.8-2.7 2.1-3.2l24.1-9.8.3-20c0-2.1 1.5-3.8 3.5-3.8Z" />
      </svg>
    </span>`,
  });

  return (
    <>
      {isSelected ? (
        <>
          <Polyline pathOptions={{ color: markerColor, opacity: 0.95, weight: 3.5 }} positions={route} />
          <CircleMarker
            center={[flight.origin.lat, flight.origin.lng]}
            pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: 0.75, opacity: 0.9 }}
            radius={4}
          />
          <CircleMarker
            center={[flight.destination.lat, flight.destination.lng]}
            pathOptions={{ color: markerColor, fillColor: "#020617", fillOpacity: 0.9, opacity: 0.9 }}
            radius={4}
          />
        </>
      ) : null}
      <Marker
        eventHandlers={{ click: () => onFlightSelect(flight.id) }}
        icon={icon}
        position={[flight.currentPosition.lat, flight.currentPosition.lng]}
      >
        <Tooltip direction="top" offset={[0, -18]} opacity={0.96}>
          <span className="font-semibold">{flight.flightNumber}</span>
          <span className="ml-1 text-slate-500">
            {flight.origin.airportCode}-{flight.destination.airportCode}
          </span>
        </Tooltip>
      </Marker>
    </>
  );
}

function getBearing(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const y = Math.sin(deltaLng) * Math.cos(destinationLat);
  const x =
    Math.cos(originLat) * Math.sin(destinationLat) -
    Math.sin(originLat) * Math.cos(destinationLat) * Math.cos(deltaLng);

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
