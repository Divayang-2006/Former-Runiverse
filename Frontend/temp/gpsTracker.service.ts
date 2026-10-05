// import Geolocation from "react-native-geolocation-service";
// import { PermissionsAndroid, Platform } from "react-native";
// import Kalman1D from "../utils/kalman";
// import { ActivityStreamService } from "./activityStream.service";

// const kalmanLat = new Kalman1D();
// const kalmanLng = new Kalman1D();

// let watchId: number | null = null;

// const ensurePermission = async (): Promise<boolean> => {
//   if (Platform.OS === "android") {
//     const finePermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
//     const hasFine = await PermissionsAndroid.check(finePermission);
//     if (hasFine) {
//       return true;
//     }
//     const status = await PermissionsAndroid.request(finePermission);
//     return status === PermissionsAndroid.RESULTS.GRANTED;
//   }

//   if (Platform.OS === "ios") {
//     const status = await Geolocation.requestAuthorization("whenInUse");
//     return status === "granted" || status === "authorized";
//   }

//   return true;
// };

// export const GPSTrackerService = {
//   async ensurePermission() {
//     return ensurePermission();
//   },

//   async start() {
//     if (watchId !== null) {
//       return true;
//     }

//     const hasPermission = await ensurePermission();
//     if (!hasPermission) {
//       return false;
//     }

//     try {
//       watchId = Geolocation.watchPosition(
//         (pos: any) => {
//           const { latitude, longitude, accuracy, speed } = pos.coords;

//           const lat = kalmanLat.filter(latitude, pos.timestamp);
//           const lng = kalmanLng.filter(longitude, pos.timestamp);

//           ActivityStreamService.recordGPS({
//             timestamp: Date.now(),
//             latitude: lat,
//             longitude: lng,
//             lat,
//             lng,
//             accuracy,
//             speed: speed || 0,
//           });
//         },
//         (err: any) => {
//           console.log("GPS error", err);
//           if (watchId !== null) {
//             Geolocation.clearWatch(watchId);
//             watchId = null;
//           }
//         },
//         {
//           enableHighAccuracy: true,
//           distanceFilter: 0,
//           interval: 1000,
//         }
//       );
//       return true;
//     } catch (error) {
//       if (watchId !== null) {
//         Geolocation.clearWatch(watchId);
//         watchId = null;
//       }
//       console.log("Failed to start GPS watch", error);
//       return false;
//     }
//   },

//   stop() {
//     if (watchId !== null) {
//       Geolocation.clearWatch(watchId);
//       watchId = null;
//     }
//   },
// };
