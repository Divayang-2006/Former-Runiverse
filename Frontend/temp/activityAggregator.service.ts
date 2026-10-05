// import haversine from "haversine-distance";
// import { ActivityPoint } from "./activityStream.service";

// export const ActivityAggregator = {
//   compute(stream: ActivityPoint[]) {
//     if (!Array.isArray(stream) || stream.length <= 1) {
//       return {
//         totalDistance: 0,
//         avgSpeed: 0,
//         calories: 0,
//         duration: 0,
//         avgPace: 0,
//       };
//     }

//     let distance = 0;

//     for (let i = 1; i < stream.length; i++) {
//       distance += haversine(
//         stream[i - 1],
//         stream[i]
//       );
//     }

//     const firstPoint = stream[0];
//     const lastPoint = stream[stream.length - 1];
//     const duration =
//       firstPoint && lastPoint
//         ? (lastPoint.timestamp - firstPoint.timestamp) / 1000
//         : 0;

//     const safeDuration = Number.isFinite(duration) ? duration : 0;
//     const avgSpeed = safeDuration > 0 ? distance / safeDuration : 0;
//     const avgPace = distance > 0 ? (safeDuration / distance) * 1000 : 0;

//     return {
//       totalDistance: distance,
//       avgSpeed,
//       calories: distance * 0.06,
//       duration: safeDuration,
//       avgPace,
//     };
//   },
// };
