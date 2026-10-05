// import * as TaskManager from "expo-task-manager";
// import * as BackgroundFetch from "expo-background-fetch";
// import { Pedometer } from "expo-sensors";

// const STEP_TASK_NAME = "BACKGROUND_STEP_TRACKING";

// // You can swap this with MMKV later
// let lastStepCount = 0;

// /**
//  * Background task definition
//  */
// TaskManager.defineTask(STEP_TASK_NAME, async () => {
//   try {
//     const isAvailable = await Pedometer.isAvailableAsync();
//     if (!isAvailable) return BackgroundFetch.BackgroundFetchResult.NoData;

//     const end = new Date();
//     const start = new Date();
//     start.setHours(0, 0, 0, 0); // today start

//     const result = await Pedometer.getStepCountAsync(start, end);

//     if (result.steps !== lastStepCount) {
//       lastStepCount = result.steps;

//       // 🔁 TODO: Persist locally or sync with backend
//       // saveStepsToStore(result.steps)
//     }

//     return BackgroundFetch.BackgroundFetchResult.NewData;
//   } catch (err) {
//     return BackgroundFetch.BackgroundFetchResult.Failed;
//   }
// });

// /**
//  * Register background service
//  */
// export async function registerStepTrackingService() {
//   const status = await BackgroundFetch.getStatusAsync();
//   if (
//     status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
//     status === BackgroundFetch.BackgroundFetchStatus.Denied
//   ) {
//     return;
//   }

//   const isRegistered = await TaskManager.isTaskRegisteredAsync(
//     STEP_TASK_NAME
//   );

//   if (!isRegistered) {
//     await BackgroundFetch.registerTaskAsync(STEP_TASK_NAME, {
//       minimumInterval: 15 * 60, // iOS minimum: 15 mins
//       stopOnTerminate: false,
//       startOnBoot: true,
//     });
//   }
// }

// /**
//  * Unregister (if needed)
//  */
// export async function unregisterStepTrackingService() {
//   await BackgroundFetch.unregisterTaskAsync(STEP_TASK_NAME);
// }
