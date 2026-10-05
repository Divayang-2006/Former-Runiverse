// import { authService } from "./AuthService";
// import { api } from "./api";
// import { ActivityAggregator } from "./activityAggregator.service";
// import { ActivityStreamService, ActivityPoint } from "./activityStream.service";

// type UploadableSession = {
//   localId: string;
//   userId: string;
//   activityType: string;
//   startTime: number;
//   endTime?: number;
// };

// export const ActivityUploadService = {
//   async upload(session: UploadableSession) {
//     await authService.hydrate();
//     const token = authService.getToken();
//     if (!token) {
//       throw new Error("Cannot upload activity without auth token");
//     }

//     const stream: ActivityPoint[] = ActivityStreamService.getStream();
//     const stats = ActivityAggregator.compute(stream);

//     const payload = {
//       startTime: session.startTime,
//       endTime: session.endTime ?? Date.now(),
//       activityType: session.activityType,
//       totalDistance: stats.totalDistance,
//       calories: stats.calories,
//       avgSpeed: stats.avgSpeed,
//       duration: stats.duration,
//       avgPace: stats.avgPace,
//       loopDetected: false,
//       hexesVisited: [],
//       detectedRoutes: [],
//       stream: stream.length ? { gps: stream } : undefined,
//     };

//     await api.post("/api/activities", payload, token);
//   },
// };
