import { area as turfArea, length as turfLength, lineString as turfLineString, polygon as turfPolygon } from "@turf/turf";

export type CoordinateTuple = [number, number];
export type PolygonRing = CoordinateTuple[];
export type PolygonRings = PolygonRing[];

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const clonePoint = (point: CoordinateTuple): CoordinateTuple => [point[0], point[1]];

export const closeRing = (points: PolygonRing): PolygonRing => {
  if (points.length === 0) {
    return [];
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (first && last && first[0] === last[0] && first[1] === last[1]) {
    return points.map(clonePoint);
  }

  return [...points.map(clonePoint), clonePoint(first)];
};

export const dedupeConsecutive = (points: PolygonRing): PolygonRing => {
  if (points.length === 0) {
    return [];
  }

  const [first, ...rest] = points;
  if (!first) {
    return [];
  }

  const deduped: PolygonRing = [clonePoint(first)];

  for (const current of rest) {
    const previous = deduped[deduped.length - 1];

    if (!current || !Array.isArray(current) || current.length < 2) {
      continue;
    }

    const lon = current[0];
    const lat = current[1];

    if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) {
      continue;
    }

    if (previous[0] === lon && previous[1] === lat) {
      continue;
    }

    deduped.push([lon, lat]);
  }

  return deduped;
};

const sanitizeRing = (ring: unknown): PolygonRing | null => {
  if (!Array.isArray(ring)) {
    return null;
  }

  const filtered: PolygonRing = [];

  for (let i = 0; i < ring.length; i += 1) {
    const point = ring[i];
    if (!Array.isArray(point) || point.length < 2) {
      continue;
    }

    const lon = point[0];
    const lat = point[1];

    if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) {
      continue;
    }

    filtered.push([lon, lat]);
  }

  if (filtered.length < 3) {
    return null;
  }

  const deduped = dedupeConsecutive(filtered);
  const closed = closeRing(deduped);

  return closed.length >= 4 ? closed : null;
};

export const sanitizePolygonRings = (rings: unknown): PolygonRings | null => {
  if (!Array.isArray(rings) || rings.length === 0) {
    return null;
  }

  const sanitized: PolygonRings = [];

  for (let i = 0; i < rings.length; i += 1) {
    const ring = sanitizeRing(rings[i]);
    if (ring) {
      sanitized.push(ring);
    }
  }

  return sanitized.length > 0 ? sanitized : null;
};

// Returns area in square meters and perimeter in meters using Turf helpers.
export const computeAreaPerimeterFromRings = (rings: PolygonRings): { area: number; perimeter: number } => {
  const polygon = turfPolygon(rings);
  const areaSqMeters = turfArea(polygon); // square meters
  const outerRing = rings[0] ?? [];
  const perimeterMeters = outerRing.length > 1 ? turfLength(turfLineString(outerRing), { units: "meters" }) : 0;

  return {
    area: areaSqMeters,
    perimeter: perimeterMeters,
  };
};

// Returns line length in meters using Turf's great-circle calculations.
export const computeLineLengthMeters = (points: PolygonRing): number => {
  if (points.length < 2) {
    return 0;
  }

  return turfLength(turfLineString(points), { units: "meters" });
};

export const sanitizeLineString = (points: unknown): PolygonRing | null => {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  const filtered: PolygonRing = [];

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (!Array.isArray(point) || point.length < 2) {
      continue;
    }

    const lon = point[0];
    const lat = point[1];

    if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) {
      continue;
    }

    filtered.push([lon, lat]);
  }

  const deduped = dedupeConsecutive(filtered);
  return deduped.length >= 2 ? deduped : null;
};
