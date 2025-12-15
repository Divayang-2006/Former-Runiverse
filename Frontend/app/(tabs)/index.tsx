// Index.tsx
import { useState, useEffect, useRef } from "react";
import { Platform, PermissionsAndroid, ScrollView, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pedometer } from "expo-sensors";
import { StyledPressable, StyledText, StyledView } from "@/components/Styled";
import { StatCard } from "@/components/StatCard";
import { Footprints, MapPin, Flame } from "lucide-react-native";
import { useStore } from "@/store/useStore";

// rough estimations
const formatDistance = (steps: number) => (steps * 0.0008).toFixed(2); // ~0.8m/step
const estimateCalories = (steps: number) => Math.round(steps * 0.04);   // ~0.04 cal/step

type DailyCaloriesEntry = {
   label: string;
   calories: number;
};

type HourlyCaloriesEntry = {
   label: string;
   calories: number;
};

const buildDailySkeleton = (): DailyCaloriesEntry[] => {
   const today = new Date();
   const days: DailyCaloriesEntry[] = [];
   for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(today);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const label = day.toLocaleDateString(undefined, {
         month: "short",
         day: "numeric",
      });
      days.push({ label, calories: 0 });
   }
   return days;
};

const buildHourlySkeleton = (): HourlyCaloriesEntry[] =>
   Array.from({ length: 24 }, (_unused, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      calories: 0,
   }));

type TodayMetricsSnapshot = {
   date: string;
   totalSteps: number;
   initialSteps: number;
   hourlyCalories: HourlyCaloriesEntry[];
   dailyCalories: DailyCaloriesEntry[];
};

const TODAY_SNAPSHOT_KEY = "runiverse:today-metrics";
const snapshotDelayMs = 300;

const getDayKey = (date: Date) => date.toISOString().split("T")[0];

export default function Index() {
   const user = useStore((s) => s.user);
   const [isPedometerAvailable, setIsPedometerAvailable] = useState<
      "checking" | "yes" | "no"
   >("checking");

   const [initialTodaySteps, setInitialTodaySteps] = useState(0);    // Steps from midnight until app launch
   const [liveStepCount, setLiveStepCount] = useState(0);            // Raw data from the sensor listener
   const [totalTodaySteps, setTotalTodaySteps] = useState(0);      // The main value to display (initial + live)
   const [dailyCalories, setDailyCalories] = useState<DailyCaloriesEntry[]>([]);
   const [hourlyCalories, setHourlyCalories] = useState<HourlyCaloriesEntry[]>([]);
   const [isCaloriesExpanded, setIsCaloriesExpanded] = useState(false);
   const expandAnim = useRef(new Animated.Value(0)).current;
   const [hasHydratedSnapshot, setHasHydratedSnapshot] = useState(false);
   const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const totalStepsRef = useRef(0);
   const latestSnapshotRef = useRef<TodayMetricsSnapshot | null>(null);

   const [isActive, setIsActive] = useState(false);                  // session toggle
   const [baseline, setBaseline] = useState(0);                      // for session reset

   const lastReadingRef = useRef(0);

   useEffect(() => {
      if (isCaloriesExpanded) {
         expandAnim.setValue(0);
         Animated.timing(expandAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
         }).start();
      }
   }, [expandAnim, isCaloriesExpanded]);

   useEffect(() => {
      // Restore the last known readings so dev reloads do not wipe today's totals
      const hydrateSnapshot = async () => {
         try {
            const serialized = await AsyncStorage.getItem(TODAY_SNAPSHOT_KEY);
            if (!serialized) {
               setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
               return;
            }
            const snapshot: TodayMetricsSnapshot = JSON.parse(serialized);
            const todayKey = getDayKey(new Date());
            if (snapshot.date !== todayKey) {
               await AsyncStorage.removeItem(TODAY_SNAPSHOT_KEY);
               setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
               return;
            }

            setTotalTodaySteps(snapshot.totalSteps ?? 0);
            setInitialTodaySteps(snapshot.initialSteps ?? snapshot.totalSteps ?? 0);
            const hydratedHourly = Array.isArray(snapshot.hourlyCalories) && snapshot.hourlyCalories.length
               ? snapshot.hourlyCalories
               : buildHourlySkeleton();
            const hydratedDaily = Array.isArray(snapshot.dailyCalories) && snapshot.dailyCalories.length
               ? snapshot.dailyCalories
               : buildDailySkeleton();
            setHourlyCalories(hydratedHourly);
            setDailyCalories(hydratedDaily);

            totalStepsRef.current = snapshot.totalSteps ?? 0;
            lastReadingRef.current = snapshot.totalSteps ?? 0;
         } catch (err) {
            console.log("hydrate step snapshot failed:", err);
            setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
            setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
         } finally {
            setHasHydratedSnapshot(true);
         }
      };

      hydrateSnapshot();
   }, []);

   useEffect(() => {
      if (!hasHydratedSnapshot) {
         return;
      }

   let subscription: { remove: () => void } | null = null;

      async function initPedometer() {
         try {
            if (typeof Pedometer.requestPermissionsAsync === "function") {
               try {
                  const { status } = await Pedometer.requestPermissionsAsync();
                  if (status !== "granted") {
                     setIsPedometerAvailable("no");
                     return;
                  }
               } catch (err) {
                  console.log("Pedometer permission request failed:", err);
               }
            }

            // Android 10+ runtime permission
            if (Platform.OS === "android" && Platform.Version >= 29) {
               const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
               );
               if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                  setIsPedometerAvailable("no");
                  return;
               }
            }

            const available = await Pedometer.isAvailableAsync();
            setIsPedometerAvailable(available ? "yes" : "no");
            if (!available) return;

            if (Platform.OS !== "android") {
               const now = new Date();
               const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
               try {
                  const past = await Pedometer.getStepCountAsync(startOfDay, now);
                  const initialSteps = past.steps ?? 0;
                  setInitialTodaySteps((prev) => (initialSteps > prev ? initialSteps : prev));
                  setTotalTodaySteps((prev) => (initialSteps > prev ? initialSteps : prev)); // Initialize total with historical data
                  lastReadingRef.current = Math.max(lastReadingRef.current, initialSteps); // Set initial last reading
               } catch (err) {
                  console.log("getStepCountAsync error:", err);
               }
            } else {
               setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
            }

            const loadDailyCalories = async () => {
               if (Platform.OS === "android") {
                  setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
                  return;
               }
               try {
                  const days: DailyCaloriesEntry[] = [];
                  const today = new Date();
                  for (let offset = 6; offset >= 0; offset--) {
                     const dayStart = new Date(today);
                     dayStart.setHours(0, 0, 0, 0);
                     dayStart.setDate(dayStart.getDate() - offset);
                     const dayEnd = new Date(dayStart);
                     dayEnd.setDate(dayEnd.getDate() + 1);
                     const stepsForDay = await Pedometer.getStepCountAsync(dayStart, dayEnd);
                     const steps = stepsForDay?.steps ?? 0;
                     const label = dayStart.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                     });
                     days.push({ label, calories: estimateCalories(steps) });
                  }
                  setDailyCalories((prev) => {
                     if (!days.length) return prev;
                     const fallbackTotal = totalStepsRef.current;
                     const fallbackCalories = estimateCalories(fallbackTotal);

                     return days.map((entry, index) => {
                        const existing = prev.find((prevEntry) => prevEntry.label === entry.label);
                        if (index === days.length - 1) {
                           const best = Math.max(entry.calories, fallbackCalories, existing?.calories ?? 0);
                           return { ...entry, calories: best };
                        }
                        if (existing) {
                           return { ...entry, calories: Math.max(entry.calories, existing.calories) };
                        }
                        return entry;
                     });
                  });
               } catch (err) {
                  console.log("daily calories history error:", err);
                  setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               }
            };

            const loadHourlyCalories = async () => {
               if (Platform.OS === "android") {
                  setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
                  return;
               }
               try {
                  const now = new Date();
                  const hours: HourlyCaloriesEntry[] = [];
                  for (let hour = 0; hour < 24; hour++) {
                     const slotStart = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        hour,
                        0,
                        0,
                        0
                     );
                     const slotEnd = new Date(slotStart);
                     slotEnd.setHours(slotEnd.getHours() + 1);

                     let calories = 0;
                     if (slotStart < now) {
                        const effectiveEnd = slotEnd > now ? now : slotEnd;
                        try {
                           const stepsForHour = await Pedometer.getStepCountAsync(slotStart, effectiveEnd);
                           const steps = stepsForHour?.steps ?? 0;
                           calories = estimateCalories(steps);
                        } catch (err) {
                           console.log("hourly calories error:", err);
                        }
                     }

                     hours.push({
                        label: `${String(hour).padStart(2, "0")}:00`,
                        calories,
                     });
                  }
                  setHourlyCalories((prev) => {
                     if (!hours.length) return prev;
                     const previousLookup = new Map(prev.map((entry) => [entry.label, entry]));
                     return hours.map((entry) => {
                        const existing = previousLookup.get(entry.label);
                        return {
                           ...entry,
                           calories: Math.max(entry.calories, existing?.calories ?? 0),
                        };
                     });
                  });
               } catch (err) {
                  console.log("load hourly calories failed:", err);
                  setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
               }
            };

            await loadDailyCalories();
            await loadHourlyCalories();

            // Subscribe to live updates
            subscription = Pedometer.watchStepCount((result) => {
               const rawSteps = result.steps ?? 0;
               setLiveStepCount(rawSteps);

               const delta = rawSteps - lastReadingRef.current;
               if (delta > 0) {
                  setTotalTodaySteps((prev) => {
                     const next = prev + delta;
                     setDailyCalories((entries) => {
                        if (!entries.length) return entries;
                        const updated = [...entries];
                        const lastIndex = updated.length - 1;
                        updated[lastIndex] = {
                           ...updated[lastIndex],
                           calories: estimateCalories(next),
                        };
                        return updated;
                     });
                     const deltaCalories = delta * 0.04;
                     setHourlyCalories((entries) => {
                        if (!entries.length) return entries;
                        const updated = [...entries];
                        const currentHour = new Date().getHours();
                        const previousEntry = updated[currentHour] ?? {
                           label: `${String(currentHour).padStart(2, "0")}:00`,
                           calories: 0,
                        };
                        updated[currentHour] = {
                           ...previousEntry,
                           calories: Math.max(0, Math.round(previousEntry.calories + deltaCalories)),
                        };
                        return updated;
                     });
                     return next;
                  });
               }
               lastReadingRef.current = rawSteps;
            });
         } catch (err) {
            console.log("Pedometer init error:", err);
            setIsPedometerAvailable("no");
         }
      }

      initPedometer();

      return () => {
         if (subscription && typeof subscription.remove === "function") {
            subscription.remove();
         }
      };
   }, [hasHydratedSnapshot]);

   const handleToggleWalk = () => {
      if (isActive) {
         setIsActive(false);
      } else {
         setBaseline(liveStepCount);
         setIsActive(true);
      }
   };

   const sessionSteps = liveStepCount - baseline;

   const totalCaloriesToday = estimateCalories(totalTodaySteps);

   useEffect(() => {
      totalStepsRef.current = totalTodaySteps;
   }, [totalTodaySteps]);

   useEffect(() => {
      // Throttle persistence so we only write when readings settle
      if (!hasHydratedSnapshot) {
         return;
      }

   const todayKey = getDayKey(new Date());

      const snapshot: TodayMetricsSnapshot = {
         date: todayKey,
         totalSteps: totalTodaySteps,
         initialSteps: initialTodaySteps,
         hourlyCalories: [...hourlyCalories],
         dailyCalories: [...dailyCalories],
      };

      latestSnapshotRef.current = snapshot;

      if (persistTimeoutRef.current) {
         clearTimeout(persistTimeoutRef.current);
      }

      persistTimeoutRef.current = setTimeout(() => {
         AsyncStorage.setItem(TODAY_SNAPSHOT_KEY, JSON.stringify(snapshot)).catch((err) => {
            console.log("persist step snapshot failed:", err);
         });
         persistTimeoutRef.current = null;
      }, snapshotDelayMs);

      return () => {
         if (persistTimeoutRef.current) {
            clearTimeout(persistTimeoutRef.current);
         }
      };
   }, [totalTodaySteps, initialTodaySteps, hourlyCalories, dailyCalories, hasHydratedSnapshot]);

   useEffect(() => {
      // Final safeguard to persist any in-flight data when the component unmounts
      return () => {
         if (persistTimeoutRef.current) {
            clearTimeout(persistTimeoutRef.current);
            persistTimeoutRef.current = null;
         }
         if (latestSnapshotRef.current) {
            AsyncStorage.setItem(TODAY_SNAPSHOT_KEY, JSON.stringify(latestSnapshotRef.current)).catch((err) => {
               console.log("persist step snapshot on cleanup failed:", err);
            });
         }
      };
   }, []);

   // Determine the maximum calorie value for scaling the charts
   const maxDailyCalories = dailyCalories.length
      ? Math.max(...dailyCalories.map((d) => d.calories))
      : 0;
   const maxHourlyCalories = hourlyCalories.length
      ? Math.max(...hourlyCalories.map((d) => d.calories))
      : 0;
   const chartHeight = 120; // Fixed height for the chart container

   return (
      <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
         <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <StyledView className="px-6 pt-6">
               <StyledView className="rounded-3xl p-6 bg-gradient-to-br from-primary/90 to-emerald-500 dark:from-primary dark:to-emerald-600 shadow-lg">
                  <StyledText className="text-xs uppercase tracking-widest text-white/80">
                     {isPedometerAvailable === "yes" ? "Daily Snapshot" : "Sensor Unavailable"}
                  </StyledText>
                  <StyledText className="mt-2 text-3xl font-bold text-white">
                     {user?.username ? `Welcome back, ${user.username}!` : "Welcome back!"}
                  </StyledText>
                  <StyledText className="mt-1 text-sm text-white/80">
                     {isPedometerAvailable === "yes"
                        ? "Keep moving—every step powers your Runiverse legend."
                        : "We couldn't access step data. Check permissions to stay in sync."}
                  </StyledText>
                  <StyledView className="mt-6 flex-row justify-between">
                     <StyledView>
                        <StyledText className="text-white/70 text-xs">Steps today</StyledText>
                        <StyledText className="text-2xl font-semibold text-white">{totalTodaySteps}</StyledText>
                     </StyledView>
                     <StyledView className="items-end">
                        <StyledText className="text-white/70 text-xs">Lifetime steps</StyledText>
                        <StyledText className="text-2xl font-semibold text-white">{user?.lifetimeSteps ?? 0}</StyledText>
                     </StyledView>
                  </StyledView>
               </StyledView>

               <StyledView className="mt-6 flex-row space-x-4">
                  <StatCard icon={Footprints} label="Steps" value={totalTodaySteps.toString()} />
                  <StatCard icon={MapPin} label="Distance" value={`${formatDistance(totalTodaySteps)} km`} />
                  <StatCard icon={Flame} label="Calories" value={estimateCalories(totalTodaySteps).toString()} />
               </StyledView>

               <StyledView className="mt-8 rounded-3xl p-6 bg-card-light dark:bg-card-dark shadow-md">
                  <StyledPressable
                     className="flex-row justify-between items-center"
                     onPress={() => setIsCaloriesExpanded((prev) => !prev)}
                  >
                     <StyledView>
                        <StyledText className="text-xs uppercase tracking-widest text-subtle-light dark:text-subtle-dark">
                           Calories Burned Today
                        </StyledText>
                        <StyledText className="text-2xl font-semibold text-text-light dark:text-text-dark">
                           {totalCaloriesToday} kcal
                        </StyledText>
                     </StyledView>
                     <StyledText className="text-lg text-subtle-light dark:text-subtle-dark">
                        {isCaloriesExpanded ? "▲" : "▼"}
                     </StyledText>
                  </StyledPressable>

                  {isCaloriesExpanded && (
                     <Animated.View
                        style={{
                           opacity: expandAnim,
                           transform: [
                              {
                                 translateY: expandAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [12, 0],
                                 }),
                              },
                           ],
                        }}
                     >
                        <StyledView className="mt-6">
                           <StyledView className="flex-row justify-between items-center">
                              <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
                                 Today's Calories by Hour
                              </StyledText>
                              <StyledText className="text-xs text-subtle-light dark:text-subtle-dark">
                                 Updated automatically
                              </StyledText>
                           </StyledView>
                           <StyledView className="mt-3 bg-background-light/60 dark:bg-background-dark/60 rounded-2xl p-4 overflow-hidden">
                              {hourlyCalories.length === 0 ? (
                                 <StyledView className="py-6 items-center">
                                    <StyledText className="text-sm text-subtle-light dark:text-subtle-dark">
                                       Hourly data will appear once we record activity today.
                                    </StyledText>
                                 </StyledView>
                              ) : (
                                 <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingRight: 16 }}
                                 >
                                    <StyledView className="flex-row items-end">
                                       {hourlyCalories.map((data) => {
                                          const barHeight = maxHourlyCalories
                                             ? Math.max((data.calories / maxHourlyCalories) * chartHeight, 4)
                                             : 4;
                                          return (
                                             <StyledView key={data.label} className="items-center mx-[4px]">
                                                <StyledText className="text-[10px] text-text-light dark:text-text-dark mb-1">
                                                   {data.calories}
                                                </StyledText>
                                                <StyledView
                                                   className="w-3 rounded-t-2xl bg-gradient-to-t from-primary to-emerald-400"
                                                   style={{ height: barHeight }}
                                                />
                                                <StyledText className="mt-1 text-[8px] text-subtle-light dark:text-subtle-dark">
                                                   {data.label}
                                                </StyledText>
                                             </StyledView>
                                          );
                                       })}
                                    </StyledView>
                                 </ScrollView>
                              )}
                           </StyledView>
                        </StyledView>

                        <StyledView className="mt-6">
                           <StyledView className="flex-row justify-between items-center">
                              <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
                                 Last 7 Days
                              </StyledText>
                              <StyledText className="text-xs text-subtle-light dark:text-subtle-dark">
                                 Daily calorie estimates
                              </StyledText>
                           </StyledView>
                           <StyledView className="mt-3 bg-background-light/60 dark:bg-background-dark/60 rounded-2xl p-4 overflow-hidden">
                              {dailyCalories.length === 0 ? (
                                 <StyledView className="py-6 items-center">
                                    <StyledText className="text-sm text-subtle-light dark:text-subtle-dark">
                                       We'll chart your calories once we have enough movement data.
                                    </StyledText>
                                 </StyledView>
                              ) : (
                                 <StyledView className="flex-row justify-between items-end">
                                    {dailyCalories.map((data) => {
                                       const barHeight = maxDailyCalories
                                          ? Math.max((data.calories / maxDailyCalories) * chartHeight, 6)
                                          : 6;
                                       return (
                                          <StyledView key={data.label} className="items-center mx-[3px]">
                                             <StyledText className="text-xs font-medium text-text-light dark:text-text-dark mb-1">
                                                {data.calories}
                                             </StyledText>
                                             <StyledView
                                                className="w-6 rounded-t-2xl bg-gradient-to-t from-primary to-emerald-400"
                                                style={{ height: barHeight }}
                                             />
                                             <StyledText className="mt-1 text-[10px] text-subtle-light dark:text-subtle-dark">
                                                {data.label}
                                             </StyledText>
                                          </StyledView>
                                       );
                                    })}
                                 </StyledView>
                              )}
                           </StyledView>
                        </StyledView>
                     </Animated.View>
                  )}
               </StyledView>

               <StyledView className="mt-8 rounded-3xl p-5 bg-card-light dark:bg-card-dark shadow-md">
                  <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
                     Session controls
                  </StyledText>
                  <StyledText className="mt-1 text-xs text-subtle-light dark:text-subtle-dark">
                     Tap start to track a focused walk. We'll keep counting even if you leave the screen.
                  </StyledText>

                  <StyledView className="mt-4 flex-row justify-between">
                     <StyledView>
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">Live steps</StyledText>
                        <StyledText className="text-xl font-semibold text-text-light dark:text-text-dark">
                           {liveStepCount}
                        </StyledText>
                     </StyledView>
                     <StyledView>
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">Session steps</StyledText>
                        <StyledText className="text-xl font-semibold text-text-light dark:text-text-dark">
                           {Math.max(sessionSteps, 0)}
                        </StyledText>
                     </StyledView>
                     <StyledView className="items-end">
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">Baseline</StyledText>
                        <StyledText className="text-xl font-semibold text-text-light dark:text-text-dark">
                           {baseline}
                        </StyledText>
                     </StyledView>
                  </StyledView>

                  <StyledView className="mt-6 items-center">
                     <StyledPressable
                        className={`w-44 h-44 rounded-full items-center justify-center shadow-2xl transition-all ${
                           isActive ? "bg-danger" : "bg-primary"
                        }`}
                        onPress={handleToggleWalk}
                     >
                        <StyledText className="text-white text-3xl font-bold">
                           {isActive ? "STOP" : "START"}
                        </StyledText>
                     </StyledPressable>
                  </StyledView>

                  <StyledView className="mt-4 border border-dashed border-primary/30 rounded-2xl px-4 py-3">
                     <StyledText className="text-[11px] text-subtle-light dark:text-subtle-dark">
                        Raw total since midnight: {initialTodaySteps} steps • Sensor reading: {liveStepCount}
                     </StyledText>
                  </StyledView>
               </StyledView>
            </StyledView>
         </ScrollView>
      </SafeAreaView>
   );
}