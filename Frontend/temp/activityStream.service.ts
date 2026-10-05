// import haversine from "haversine-distance";
// import { Storage } from "./mmkv.storage";

// export type ActivityPoint = {
//   latitude: number;
//   longitude: number;
//   timestamp: number;
//   accuracy: number | null;
//   speed: number;
//   lat: number;
//   lng: number;
// };

// export type ActivityStatsRecord = {
//   distance: number;
//   duration: number;
//   avgPace: number;
//   lastSplitDistance: number;
//   splitPace: number;
//   startTimestamp: number;
//   lastTimestamp: number;
// };

// let streamKey = "";
// let statsKey = "";
// let lastPoint: { latitude: number; longitude: number; timestamp: number } | null = null;

// export const ActivityStreamService = {
//   init(localId: string) {
//     const now = Date.now();
//     streamKey = `STREAM_${localId}`;
//     statsKey = `STATS_${localId}`;

//     Storage.set(streamKey, []);
//     const initialStats: ActivityStatsRecord = {
//       distance: 0,
//       duration: 0,
//       avgPace: 0,
//       lastSplitDistance: 0,
//       splitPace: 0,
//       startTimestamp: now,
//       lastTimestamp: now,
//     };
//     Storage.set(statsKey, initialStats);

//     lastPoint = null;
//   },

//   recordGPS(point: any) {
//     if (!streamKey || !statsKey) {
//       return;
//     }

//     const latitude =
//       typeof point.latitude === "number" ? point.latitude : point.lat;
//     const longitude =
//       typeof point.longitude === "number" ? point.longitude : point.lng;

//     if (typeof latitude !== "number" || typeof longitude !== "number") {
//       return;
//     }

//     const normalizedPoint: ActivityPoint = {
//       latitude,
//       longitude,
//       timestamp: point.timestamp ?? Date.now(),
//       accuracy:
//         typeof point.accuracy === "number" ? point.accuracy : null,
//       speed: typeof point.speed === "number" ? point.speed : 0,
//       lat: latitude,
//       lng: longitude,
//     };

//     Storage.appendArray(streamKey, normalizedPoint);

//     const stats = Storage.get<ActivityStatsRecord>(statsKey);
//     if (!stats) {
//       return;
//     }

//     if (lastPoint) {
//       const d = haversine(lastPoint, normalizedPoint);
//       stats.distance += d;
//       stats.lastSplitDistance += d;

//       stats.duration = Math.max(
//         0,
//         (normalizedPoint.timestamp - stats.startTimestamp) / 1000
//       );

//       while (stats.lastSplitDistance >= 1000) {
//         stats.splitPace = Math.max(
//           0,
//           (normalizedPoint.timestamp - stats.lastTimestamp) / 1000
//         );
//         stats.lastSplitDistance -= 1000;
//         stats.lastTimestamp = normalizedPoint.timestamp;
//       }

//       stats.avgPace =
//         stats.distance > 0
//           ? (stats.duration / stats.distance) * 1000
//           : 0;
//     } else {
//       stats.duration = 0;
//       stats.lastTimestamp = normalizedPoint.timestamp;
//     }

//     lastPoint = normalizedPoint;
//     Storage.set(statsKey, stats);
//   },

//   getStats() {
//     if (!statsKey) return null;
//     return Storage.get<ActivityStatsRecord>(statsKey);
//   },

//   getStream() {
//     if (!streamKey) return [];
//     return Storage.get<ActivityPoint[]>(streamKey) ?? [];
//   },

//   clear() {
//     if (streamKey) {
//       Storage.remove(streamKey);
//     }
//     if (statsKey) {
//       Storage.remove(statsKey);
//     }
//     streamKey = "";
//     statsKey = "";
//     lastPoint = null;
//   },
// };
