// import { v4 as uuid } from "uuid";
// import { Storage } from "./mmkv.storage";
// import { ActivityStreamService } from "./activityStream.service";

// const ACTIVITY_KEY = "ACTIVE_ACTIVITY";

// export const ActivitySessionService = {
//   start(activityType: string, userId: string) {
//     const session = {
//       localId: uuid(),
//       userId,
//       activityType,
//       startTime: Date.now(),
//       status: "RECORDING",
//     };

//     Storage.set(ACTIVITY_KEY, session);
//     ActivityStreamService.init(session.localId);

//     return session;
//   },

//   getActive() {
//     return Storage.get(ACTIVITY_KEY);
//   },

//   stop() {
//     const session = Storage.get<any>(ACTIVITY_KEY);
//     if (!session) return null;

//     session.endTime = Date.now();
//     session.status = "FINISHED";

//     Storage.set(ACTIVITY_KEY, session);
//     return session;
//   },

//   clear() {
//     Storage.remove(ACTIVITY_KEY);
//   },
// };
