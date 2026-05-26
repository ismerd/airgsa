'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

const RADIUS = 2.1;

const AIRPORTS: Record<string, { lat: number; lng: number; label: string }> = {
  FRA: { lat: 50.037, lng: 8.562,   label: 'Frankfurt' },
  JED: { lat: 21.670, lng: 39.156,  label: 'Jeddah' },
  SIN: { lat: 1.350,  lng: 103.994, label: 'Singapore' },
  DXB: { lat: 25.253, lng: 55.364,  label: 'Dubai' },
  LHR: { lat: 51.477, lng: -0.461,  label: 'London' },
  RUH: { lat: 24.958, lng: 46.699,  label: 'Riyadh' },
  IST: { lat: 40.976, lng: 28.814,  label: 'Istanbul' },
};

const ROUTES: [string, string][] = [
  ['FRA', 'JED'],
  ['FRA', 'SIN'],
  ['IST', 'DXB'],
  ['JED', 'LHR'],
  ['RUH', 'FRA'],
];

function latLngToVec3(lat: number, lng: number, r = RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function getArcPoints(
  from: THREE.Vector3,
  to: THREE.Vector3,
  segments = 64,
  height = 0.48,
): THREE.Vector3[] {
  const mid = from.clone().add(to).normalize().multiplyScalar(RADIUS + height);
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  return curve.getPoints(segments);
}

// ─── Globe sphere + atmosphere ─────────────────────────────────────────────
function GlobeSphere() {
  return (
    <>
      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[RADIUS, 72, 72]} />
        <meshPhongMaterial
          color="#040C1E"
          emissive="#030810"
          shininess={12}
          transparent
          opacity={0.97}
        />
      </mesh>
      {/* Outer atmosphere glow */}
      <mesh>
        <sphereGeometry args={[RADIUS * 1.08, 32, 32]} />
        <meshPhongMaterial
          color="#1A5AFF"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Inner edge glow */}
      <mesh>
        <sphereGeometry args={[RADIUS * 1.02, 32, 32]} />
        <meshPhongMaterial
          color="#1A3080"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

// ─── Latitude/longitude grid lines ────────────────────────────────────────
function GlobeGrid() {
  const latLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts: THREE.Vector3[] = [];
      for (let lng = 0; lng <= 362; lng += 3) {
        pts.push(latLngToVec3(lat, lng - 180, RADIUS + 0.003));
      }
      lines.push(pts);
    }
    return lines;
  }, []);

  const lngLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let lng = 0; lng < 360; lng += 20) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -88; lat <= 88; lat += 3) {
        pts.push(latLngToVec3(lat, lng - 180, RADIUS + 0.003));
      }
      lines.push(pts);
    }
    return lines;
  }, []);

  return (
    <>
      {latLines.map((pts, i) => (
        <Line key={`lat-${i}`} points={pts} color="#0D1E40" lineWidth={0.6} />
      ))}
      {lngLines.map((pts, i) => (
        <Line key={`lng-${i}`} points={pts} color="#0D1E40" lineWidth={0.6} />
      ))}
    </>
  );
}

// ─── Route arcs ──────────────────────────────────────────────────────────
function RouteArcs() {
  const arcData = useMemo(() =>
    ROUTES.map(([fromCode, toCode]) => {
      const from = latLngToVec3(AIRPORTS[fromCode].lat, AIRPORTS[fromCode].lng);
      const to   = latLngToVec3(AIRPORTS[toCode].lat,   AIRPORTS[toCode].lng);
      return getArcPoints(from, to);
    }),
  []);

  return (
    <>
      {arcData.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#1A5AFF"
          lineWidth={1.8}
          transparent
          opacity={0.85}
        />
      ))}
      {/* Glow layer — wider, more transparent */}
      {arcData.map((pts, i) => (
        <Line
          key={`glow-${i}`}
          points={pts}
          color="#4080FF"
          lineWidth={4}
          transparent
          opacity={0.18}
        />
      ))}
    </>
  );
}

// ─── Airport dots (pulsing) ───────────────────────────────────────────────
function AirportDot({ lat, lng }: { lat: number; lng: number }) {
  const outerRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLngToVec3(lat, lng, RADIUS + 0.018), [lat, lng]);

  useFrame(({ clock }) => {
    if (!outerRef.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 1.8) * 0.4;
    outerRef.current.scale.setScalar(s);
  });

  return (
    <group position={pos}>
      {/* Core dot */}
      <mesh>
        <sphereGeometry args={[0.025, 10, 10]} />
        <meshBasicMaterial color="#00D4FF" />
      </mesh>
      {/* Pulsing halo */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color="#1A5AFF" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function AirportDots() {
  return (
    <>
      {Object.values(AIRPORTS).map(({ lat, lng, label }) => (
        <AirportDot key={label} lat={lat} lng={lng} />
      ))}
    </>
  );
}

// ─── Rotating group ───────────────────────────────────────────────────────
function Globe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.18, -0.4, 0]}>
      <GlobeSphere />
      <GlobeGrid />
      <RouteArcs />
      <AirportDots />
    </group>
  );
}

// ─── Scene export ─────────────────────────────────────────────────────────
export function GlobeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.8], fov: 38 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[6, 4, 4]}
        intensity={0.9}
        color="#4A80FF"
      />
      <pointLight position={[-5, -3, -3]} intensity={0.5} color="#1A5AFF" />
      <pointLight position={[0, 5, 2]} intensity={0.3} color="#00D4FF" />
      <Globe />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
      />
    </Canvas>
  );
}
