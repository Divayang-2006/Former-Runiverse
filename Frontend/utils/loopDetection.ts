// src/utils/loopDetection.ts

export function distance(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function pathLengthMeters(path: [number, number][]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    length += distance(path[i - 1], path[i]);
  }
  return length;
}

export function polygonAreaMeters2(points: [number, number][]): number {
  if (points.length < 3) return 0;

  // Approximate shoelace formula with meter conversion for small areas
  const n = points.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [x1, y1] = points[i]; // lon, lat
    const [x2, y2] = points[j];
    area += x1 * y2 - x2 * y1;
  }
  area = Math.abs(area) / 2;

  // Convert degrees to meters (approximation using average latitude)
  const avgLat = points.reduce((sum, p) => sum + p[1], 0) / n;
  const metersPerDegLat = 111132.92 - 559.82 * Math.cos(2 * avgLat * Math.PI / 180) + 1.175 * Math.cos(4 * avgLat * Math.PI / 180);
  const metersPerDegLon = (Math.PI / 180) * 6367449 * Math.cos(avgLat * Math.PI / 180);

  return area * metersPerDegLon * metersPerDegLat;
}

export function isClosedLoop(path: [number, number][], startTime: number | null): boolean {
  if (path.length < 3 || startTime === null) return false;

  const start = path[0];
  const end = path[path.length - 1];
  const distToStart = distance(start, end);
  const elapsed = Date.now() - startTime;
  const pathLen = pathLengthMeters(path);

  // Parameters to prevent small or invalid loops:
  // - Min elapsed time: 30 seconds (to avoid quick accidental loops)
  // - Min path length: 50 meters (to avoid tiny loops)
  // - Max distance to close: 20 meters (GPS accuracy tolerance)
  const MIN_TIME = 30000; // 30 seconds
  const MIN_PATH_LENGTH = 50; // meters
  const MAX_CLOSE_DISTANCE = 20; // meters

  return distToStart < MAX_CLOSE_DISTANCE && elapsed > MIN_TIME && pathLen > MIN_PATH_LENGTH;
}