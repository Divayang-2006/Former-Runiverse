// import { useEffect, useState } from "react";

// import { ActivityStreamService } from "@/services/activityStream.service";
// import { mmkv } from "@/services/mmkv.storage";

// export type LiveStats = {
//   distance: number;
//   duration: number;
//   avgPace: number;
//   lastSplitDistance: number;
//   splitPace: number;
// };

// const DEFAULT_STATS: LiveStats = {
//   distance: 0,
//   duration: 0,
//   avgPace: 0,
//   lastSplitDistance: 0,
//   splitPace: 0,
// };

// export function useLiveStats(): LiveStats {
//   const [stats, setStats] = useState<LiveStats>(DEFAULT_STATS);

//   useEffect(() => {
//     let isMounted = true;

//     const update = () => {
//       const current = ActivityStreamService.getStats();
//       if (!isMounted) return;
//       if (!current) {
//         setStats(DEFAULT_STATS);
//         return;
//       }

//       setStats({
//         distance: current.distance,
//         duration: current.duration,
//         avgPace: current.avgPace,
//         lastSplitDistance: current.lastSplitDistance,
//         splitPace: current.splitPace,
//       });
//     };

//     update();

//     const listener = mmkv.addOnValueChangedListener((changedKey: string) => {
//       if (changedKey?.startsWith("STATS_")) {
//         update();
//       }
//     });

//     const ticker = setInterval(update, 1000);

//     return () => {
//       isMounted = false;
//       listener.remove();
//       clearInterval(ticker);
//     };
//   }, []);

//   return stats;
// }
