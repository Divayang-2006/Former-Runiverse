import { useState, useEffect, useRef } from "react";
import { Platform, PermissionsAndroid, useWindowDimensions, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { Pedometer } from "expo-sensors";
import { StyledPressable, StyledText, StyledView } from "@/components/Styled";
import { Footprints, MapPin, Flame, ChevronDown } from "lucide-react-native";
import { useStore } from "@/store/useStore";
import Animated, {
   FadeInDown,
   FadeInUp,
   FadeOutDown,
   Layout,
   Easing,
   cancelAnimation,
   interpolate,
   runOnJS,
   useAnimatedScrollHandler,
   useAnimatedStyle,
   useAnimatedProps,
   useSharedValue,
   withRepeat,
   withSequence,
   withDelay,
   withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { G, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { routeHistoryService, RouteHistoryEntry } from "@/services/routeHistoryService";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from "../../context/ThemeContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// rough estimations
const formatDistance = (steps: number) => (steps * 0.0008).toFixed(2); // ~0.8m/step
const estimateCalories = (steps: number) => Math.round(steps * 0.04);   // ~0.04 cal/step

const METRIC_GOALS = {
   steps: 12000,
   calories: 600,
   distance: 8,
} as const;

const DESIGN_COLORS = {
   accent: '#00F0FF',
   secondary: '#FF9D42',
};

type GlowingRingProps = {
   radius: number;
   stroke: number;
   progress: number;
   color: string;
   index: number;
   isDark: boolean;
};

const GlowingRing = ({ radius, stroke, progress, color, index, isDark }: GlowingRingProps) => {
   const circumference = 2 * Math.PI * radius;
   const fillProgress = useSharedValue(0);

   useEffect(() => {
      fillProgress.value = 0;
      fillProgress.value = withDelay(
         index * 200,
         withTiming(progress, {
            duration: 1500,
            easing: Easing.out(Easing.exp),
         }),
      );
   }, [fillProgress, index, progress]);

   const animatedProps = useAnimatedProps(() => ({
      strokeDashoffset: circumference * (1 - fillProgress.value),
   }));

   return (
      <G rotation="-90" origin="120, 120">
         <Circle
            cx="120"
            cy="120"
            r={radius}
            stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
            strokeWidth={stroke}
            fill="transparent"
         />
         <AnimatedCircle
            cx="120"
            cy="120"
            r={radius}
            stroke={color}
            strokeWidth={stroke + 4}
            strokeOpacity={0.4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            fill="transparent"
            animatedProps={animatedProps}
         />
         <AnimatedCircle
            cx="120"
            cy="120"
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            fill="transparent"
            animatedProps={animatedProps}
         />
      </G>
   );
};

const clamp01 = (value: number) => {
   if (Number.isNaN(value)) {
      return 0;
   }
   return Math.min(Math.max(value, 0), 1);
};

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
   const insets = useSafeAreaInsets();
   const { colors, isDark } = useTheme();
   const { width } = useWindowDimensions();
   const isWideScreen = width >= 620;
   const [isPedometerAvailable, setIsPedometerAvailable] = useState<
      "checking" | "yes" | "no"
   >("checking");

   const [initialTodaySteps, setInitialTodaySteps] = useState(0);
   const [liveStepCount, setLiveStepCount] = useState(0);
   const [totalTodaySteps, setTotalTodaySteps] = useState(0);
   const [dailyCalories, setDailyCalories] = useState<DailyCaloriesEntry[]>([]);
   const [hourlyCalories, setHourlyCalories] = useState<HourlyCaloriesEntry[]>([]);
   const [hasHydratedSnapshot, setHasHydratedSnapshot] = useState(false);
   const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const totalStepsRef = useRef(0);
   const latestSnapshotRef = useRef<TodayMetricsSnapshot | null>(null);
   const [routeHistory, setRouteHistory] = useState<RouteHistoryEntry[]>([]);
   const [isLoadingRouteHistory, setIsLoadingRouteHistory] = useState(true);
   const [isCalorieExpanded, setIsCalorieExpanded] = useState(true);

   const expandProgress = useSharedValue(1);
   const borderPulse = useSharedValue(0);
   const ctaPulse = useSharedValue(1);

   useEffect(() => {
      expandProgress.value = withTiming(isCalorieExpanded ? 1 : 0, {
         duration: 300,
         easing: Easing.inOut(Easing.ease),
      });
   }, [isCalorieExpanded, expandProgress]);

   const [isActive, setIsActive] = useState(false);
   const [baseline, setBaseline] = useState(0);

   const lastReadingRef = useRef(0);

   const chartBackground = isDark ? colors.background.tertiary : colors.background.secondary;
   const hourlyBarGradient = (isDark
      ? [colors.status.warning, colors.accent.secondary]
      : [colors.status.warning, colors.accent.primary]) as [string, string];
   const dailyBarGradient = (isDark
      ? [colors.status.success, colors.status.info]
      : [colors.accent.secondary, colors.status.info]) as [string, string];
   const withAlpha = (hex: string, alpha: string) => (hex.length === 7 ? `${hex}${alpha}` : hex);

   useEffect(() => {
      borderPulse.value = withRepeat(
         withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
         -1,
         true,
      );

      return () => {
         cancelAnimation(borderPulse);
         borderPulse.value = 0;
      };
   }, [borderPulse]);

   useEffect(() => {
      ctaPulse.value = withRepeat(
         withSequence(
            withTiming(1.045, { duration: 900, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
         ),
         -1,
         false,
      );

      return () => {
         cancelAnimation(ctaPulse);
         ctaPulse.value = 1;
      };
   }, [ctaPulse]);

   useEffect(() => {
      // Restore the last known readings so dev reloads do not wipe today's totals
      const hydrateSnapshot = async () => {
         try {
            // First, try to load from AsyncStorage (local cache)
            const serialized = await AsyncStorage.getItem(TODAY_SNAPSHOT_KEY);
            if (!serialized) {
               console.log("📊 No local snapshot found, will use backend data");
               setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
               return;
            }
            const snapshot: TodayMetricsSnapshot = JSON.parse(serialized);
            const todayKey = getDayKey(new Date());
            if (snapshot.date !== todayKey) {
               console.log("📊 Local snapshot is from different day, clearing");
               await AsyncStorage.removeItem(TODAY_SNAPSHOT_KEY);
               setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
               return;
            }

            console.log("📊 Hydrating from local snapshot:", snapshot.totalSteps, "steps");
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
            console.log("⚠️ hydrate step snapshot failed:", err);
            setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
            setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
         } finally {
            setHasHydratedSnapshot(true);
         }
      };

      hydrateSnapshot();
   }, []);

   useEffect(() => {
      let isMounted = true;
      routeHistoryService
         .getRouteHistory()
         .then((entries) => {
            if (!isMounted) {
               return;
            }
            setRouteHistory(entries);
         })
         .catch((error) => {
            console.log("route history load failed:", error);
         })
         .finally(() => {
            if (isMounted) {
               setIsLoadingRouteHistory(false);
            }
         });

      return () => {
         isMounted = false;
      };
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

   const toggleCalorieExpanded = () => setIsCalorieExpanded((prev) => !prev);

   const handleRouteHistoryPress = () => { };

   const sessionSteps = liveStepCount - baseline;

   const totalCaloriesToday = estimateCalories(totalTodaySteps);
   const totalDistanceKm = parseFloat(formatDistance(totalTodaySteps));

   const heroMetrics = [
      {
         key: "steps",
         label: "Today",
         value: totalTodaySteps,
         formattedValue: totalTodaySteps.toLocaleString(),
         goal: METRIC_GOALS.steps,
         color: colors.accent.primary,
         trackColor: withAlpha(colors.accent.primary, isDark ? "33" : "24"),
         suffix: "steps",
         helper: `${METRIC_GOALS.steps.toLocaleString()} goal`,
      },
      {
         key: "calories",
         label: "Calories",
         value: totalCaloriesToday,
         formattedValue: `${totalCaloriesToday}`,
         goal: METRIC_GOALS.calories,
         color: colors.status.warning,
         trackColor: withAlpha(colors.status.warning, isDark ? "33" : "24"),
         suffix: "kcal",
         helper: `${METRIC_GOALS.calories} target`,
      },
      {
         key: "distance",
         label: "Distance",
         value: totalDistanceKm,
         formattedValue: totalDistanceKm.toFixed(2),
         goal: METRIC_GOALS.distance,
         color: colors.status.success,
         trackColor: withAlpha(colors.status.success, isDark ? "33" : "24"),
         suffix: "km",
         helper: `${METRIC_GOALS.distance} km goal`,
      },
   ] as const;
   const sessionSummaryTiles = [
      { label: "Live steps", value: liveStepCount, accent: colors.status.info, Icon: Footprints },
      { label: "Session", value: Math.max(sessionSteps, 0), accent: colors.accent.primary, Icon: Flame },
      { label: "Baseline", value: baseline, accent: colors.status.warning, Icon: MapPin },
   ] as const;

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
   const safeMaxDailyCalories = Math.max(maxDailyCalories, 1);
   const safeMaxHourlyCalories = Math.max(maxHourlyCalories, 1);
   const formatRouteDateLabel = (dateIso: string) => {
      const date = new Date(dateIso);
      if (Number.isNaN(date.getTime())) {
         return "—";
      }
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
   };
   const weeklyAverageCalories = dailyCalories.length
      ? Math.round(dailyCalories.reduce((sum, day) => sum + day.calories, 0) / dailyCalories.length)
      : 0;
   const bestDayEntry = dailyCalories.reduce(
      (best, entry) => (entry.calories > best.calories ? entry : best),
      dailyCalories[0] ?? { label: "—", calories: 0 }
   );
   const peakHourEntry = hourlyCalories.reduce(
      (best, entry) => (entry.calories > best.calories ? entry : best),
      hourlyCalories[0] ?? { label: "--:--", calories: 0 }
   );
   const calorieHighlights = [
      { label: "Weekly avg", value: `${weeklyAverageCalories} kcal` },
      {
         label: "Peak hour",
         value: peakHourEntry.calories ? `${peakHourEntry.calories} kcal @ ${peakHourEntry.label}` : "Gathering data",
      },
      {
         label: "Best day",
         value: bestDayEntry.calories ? `${bestDayEntry.calories} kcal (${bestDayEntry.label})` : "Keep moving",
      },
   ];

   const expandedStyle = useAnimatedStyle(() => {
      return {
         opacity: expandProgress.value,
         height: expandProgress.value === 0 ? 0 : undefined,
         overflow: 'hidden' as const,
      };
   });
   const heroGlowStyle = useAnimatedStyle(() => {
      const glow = interpolate(borderPulse.value, [0, 1], [0.4, 0.85]);
      const scale = interpolate(borderPulse.value, [0, 1], [0.98, 1.02]);
      return {
         opacity: glow,
         transform: [{ scale }],
         shadowOpacity: glow,
      };
   });
   const routeHistoryPreview = routeHistory.slice(0, 3);
   const fallbackRouteRows = [
      {
         id: "route-placeholder-1",
         title: "Syncing routes",
         subtitle: "We\'ll list your latest adventures here soon.",
         badge: undefined,
      },
      {
         id: "route-placeholder-2",
         title: "Stay active",
         subtitle: "Record a walk to unlock history insights.",
         badge: undefined,
      },
      {
         id: "route-placeholder-3",
         title: "Need inspiration?",
         subtitle: "Explore territories to populate this timeline.",
         badge: undefined,
      },
   ];
   const routeRows = routeHistoryPreview.length
      ? routeHistoryPreview.map((entry, index) => ({
         id: entry.id ?? `route-${index}`,
         title: formatRouteDateLabel(entry.date),
         subtitle: `${entry.totalDistanceKm.toFixed(2)} km loop`,
         badge: index === 0 ? "Latest" : undefined,
      }))
      : fallbackRouteRows;

   return (
      <ScreenWrapper bg={isDark ? "bg-[#0f1014]" : "bg-gray-50"}>
         <SafeAreaView className="flex-1">
         <Animated.ScrollView
            contentContainerStyle={{ paddingTop: 16,  paddingBottom: 100, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
         >
            <Animated.View entering={FadeInDown.duration(800).springify()} className="mt-4 mb-6">
               <StyledView className="flex-row justify-between items-end">
                  <StyledView>
                     <StyledText className="text-[16px] font-medium opacity-70 mb-1" style={{ color: colors.text.secondary }}>
                        Welcome back,
                     </StyledText>

                        <StyledText className="text-[34px] font-black tracking-tighter" style={{ color: colors.text.primary }}>
                           {user?.username || "Legend"}
                        </StyledText>
                  </StyledView>
                  <StyledView className="flex-row items-center bg-gray-800/10 px-3 py-1.5 rounded-full border border-gray-500/20">
                     <StyledView className={`w-2 h-2 rounded-full mr-2 ${isPedometerAvailable === 'yes' ? 'bg-green-400' : 'bg-red-400'}`} />
                     <StyledText className="text-[10px] font-bold opacity-80" style={{ color: colors.text.primary }}>
                        {isPedometerAvailable === 'yes' ? "SYNCED" : "OFFLINE"}
                     </StyledText>
                  </StyledView>
               </StyledView>
            </Animated.View>
            <Animated.View 
               entering={FadeInUp.duration(1000).delay(200).springify()}
               className="rounded-[40px] overflow-hidden mb-8"
               style={{
                  elevation: 20,
                  shadowColor: isDark ? '#00F0FF' : '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isDark ? 0.3 : 0.15,
                  shadowRadius: 20,
               }}
            >
               <LinearGradient
                  colors={isDark ? ['#1a1b2e', '#121212'] : colors.gradients.oceanBreeze}
                  style={{ position: 'absolute', width: '100%', height: '100%' }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
               />
               <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} className="p-1">
                  <StyledView className="p-6 items-center">
                     <StyledView className="flex-row justify-between items-end w-full mb-4">
                        <StyledView>
                           <StyledText className="text-[22px] font-bold tracking-tight" style={{ color: colors.text.primary }}>
                              Daily Progress
                           </StyledText>
                           <StyledText className="text-[12px] font-semibold" style={{ color: colors.text.secondary }}>
                              {isPedometerAvailable === 'yes' ? 'Syncing live' : 'Sensor offline'}
                           </StyledText>
                        </StyledView>
                        <StyledView className="flex-row items-center bg-gray-800/10 px-3 py-1.5 rounded-full border border-gray-500/20">
                           <StyledView className={`w-2 h-2 rounded-full mr-2 ${isPedometerAvailable === 'yes' ? 'bg-green-400' : 'bg-red-400'}`} />
                           <StyledText className="text-[10px] font-bold opacity-80" style={{ color: colors.text.primary }}>
                              {isPedometerAvailable === 'yes' ? 'SYNCED' : 'OFFLINE'}
                           </StyledText>
                        </StyledView>
                     </StyledView>
                     <StyledView className="relative items-center justify-center mb-4" style={{ height: 260, width: 260 }}>
                        <Svg width="260" height="260" viewBox="0 0 240 240">
                           <Circle cx="120" cy="120" r="110" fill={isDark ? '#00000030' : '#ffffff30'} />
                           {heroMetrics.map((metric, index) => {
                              const color = isDark && index === 0 ? DESIGN_COLORS.accent : (isDark && index === 1 ? DESIGN_COLORS.secondary : metric.color);
                              return (
                                 <GlowingRing
                                    key={metric.key}
                                    radius={100 - (index * 25)}
                                    stroke={14}
                                    progress={Math.min(metric.value / metric.goal, 1)}
                                    color={color}
                                    index={index}
                                    isDark={isDark}
                                 />
                              );
                           })}
                        </Svg>
                        {/* <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center">
                           <Animated.View entering={FadeInDown.delay(1000).springify()}>
                              <StyledText
                                 className="text-[52px] font-black tracking-tighter"
                                 style={{
                                    color: isDark ? 'white' : colors.text.primary,
                                    textShadowColor: isDark ? 'rgba(255,255,255,0.5)' : 'transparent',
                                    textShadowRadius: 10,
                                 }}
                              >
                                 {totalTodaySteps.toLocaleString()}
                              </StyledText>
                              {/* <StyledText
                                 className="text-[14px] font-semibold text-center opacity-60 uppercase tracking-widest"
                                 style={{ color: isDark ? '#A0A0A0' : colors.text.secondary }}
                              >
                                 Steps
                              </StyledText>
                           </Animated.View>
                        </StyledView> */}
                     </StyledView>
                     <StyledView className="flex-row justify-between w-full mt-2 gap-3">
                        {heroMetrics.map((metric) => (
                           <StyledView
                              key={metric.key}
                              className="flex-1 rounded-2xl p-3 items-center"
                              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)' }}
                           >
                              <StyledView className="flex-row items-center mb-1">
                                 <StyledView style={{ backgroundColor: metric.color, width: 6, height: 6, borderRadius: 6, marginRight: 6 }} />
                                 <StyledText className="text-[10px] font-bold opacity-60 uppercase" style={{ color: colors.text.secondary }}>
                                    {metric.label}
                                 </StyledText>
                              </StyledView>
                              <StyledText className="text-[15px] font-bold" style={{ color: colors.text.primary }}>
                                 {metric.formattedValue}
                                 <StyledText className="text-[10px]">{metric.suffix}</StyledText>
                              </StyledText>
                           </StyledView>
                        ))}
                     </StyledView>
                  </StyledView>
               </BlurView>
               <Animated.View
                  pointerEvents="none"
                  style={[
                     StyleSheet.absoluteFillObject,
                     {
                        borderRadius: 40,
                        shadowColor: isDark ? DESIGN_COLORS.accent : colors.status.info,
                        shadowRadius: 30,
                        shadowOffset: { width: 0, height: 0 },
                        backgroundColor: 'transparent',
                     },
                     heroGlowStyle,
                  ]}
               />
            </Animated.View>

            <Animated.View 
               entering={FadeInDown.duration(500).delay(120).springify()}
               exiting={FadeOutDown.duration(300)}
               layout={Layout.springify()}
               className="mb-4"
            >
               <StyledView
                  className="rounded-3xl p-6"
                  style={{
                     backgroundColor: colors.background.elevated,
                     borderColor: colors.border.medium,
                     borderWidth: 1,
                     shadowColor: isDark ? '#000' : '#1a1a1a',
                     shadowOffset: { width: 0, height: 8 },
                     shadowOpacity: isDark ? 0.5 : 0.15,
                     shadowRadius: 16,
                     elevation: 12,
                  }}
               >
                  <StyledView className="flex-row items-center justify-between mb-5">
                     <StyledView className="flex-1">
                        <StyledText className="text-[22px] font-bold tracking-tight" style={{ color: colors.text.primary }}>
                           Calorie Tracking
                        </StyledText>
                        <StyledText className="text-[28px] font-black mt-1.5 tracking-tight" style={{ color: colors.accent.primary }}>
                           {totalCaloriesToday} kcal
                        </StyledText>
                     </StyledView>
                     <StyledPressable
                        onPress={toggleCalorieExpanded}
                        className="px-4 py-2.5 rounded-xl"
                        style={{ backgroundColor: `${colors.status.info}20` }}
                     >
                        <StyledText className="text-[11px] font-bold tracking-wide" style={{ color: colors.status.info }}>
                           {isCalorieExpanded ? "COLLAPSE" : "EXPAND"}
                        </StyledText>
                     </StyledPressable>
                  </StyledView>

                  <Animated.View style={[expandedStyle]}>
                     {isCalorieExpanded && (
                        <>
                        <StyledView className="mt-6">
                           <StyledView className="flex-row justify-between items-center mb-3">
                              <StyledText className="text-[18px] font-bold tracking-tight" style={{ color: colors.text.primary }}>
                                 Hourly burn
                              </StyledText>
                              <StyledText className="text-[11px] font-semibold" style={{ color: colors.text.secondary }}>
                                 {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </StyledText>
                           </StyledView>
                           <StyledView
                              className="mt-2 rounded-2xl p-5"
                              style={{
                                 backgroundColor: chartBackground,
                                 borderColor: colors.border.light,
                                 borderWidth: 1,
                                 height: chartHeight + 60,
                                 shadowColor: isDark ? '#000' : colors.accent.primary,
                                 shadowOffset: { width: 0, height: 2 },
                                 shadowOpacity: isDark ? 0.3 : 0.08,
                                 shadowRadius: 8,
                                 elevation: 3,
                              }}
                           >
                              {hourlyCalories.length === 0 ? (
                                 <StyledView className="py-6 items-center">
                                    <StyledText className="text-sm" style={{ color: colors.text.secondary }}>
                                       Hourly data will appear once we record activity today.
                                    </StyledText>
                                 </StyledView>
                              ) : (() => {
                                 const padding = 30;
                                 const barWidth = 12;
                                 const gap = 4;
                                 const graphWidth = hourlyCalories.length * (barWidth + gap) + padding * 2;
                                 const graphHeight = chartHeight;
                                 const currentHour = new Date().getHours();
                                 
                                 return (
                                    <Animated.ScrollView
                                       horizontal
                                       showsHorizontalScrollIndicator={false}
                                       contentContainerStyle={{ paddingRight: 16 }}
                                    >
                                       <StyledView style={{ width: graphWidth }}>
                                          <Svg width={graphWidth} height={graphHeight}>
                                             <Defs>
                                                <SvgLinearGradient id="hourlyBarGradient" x1="0" y1="0" x2="0" y2="1">
                                                   <Stop offset="0%" stopColor={hourlyBarGradient[0]} stopOpacity="0.9" />
                                                   <Stop offset="100%" stopColor={hourlyBarGradient[1]} stopOpacity="0.6" />
                                                </SvgLinearGradient>
                                             </Defs>
                                             {/* Guiding lines */}
                                             {[0.25, 0.5, 0.75].map((fraction, idx) => {
                                                const y = padding + (1 - fraction) * (graphHeight - padding * 2);
                                                return (
                                                   <Line
                                                      key={`guide-${idx}`}
                                                      x1={padding}
                                                      y1={y}
                                                      x2={graphWidth - padding}
                                                      y2={y}
                                                      stroke={colors.border.light}
                                                      strokeWidth="1"
                                                      strokeDasharray="4,4"
                                                      opacity="0.4"
                                                   />
                                                );
                                             })}
                                             {hourlyCalories.map((data, idx) => {
                                                const barHeight = Math.max((data.calories / safeMaxHourlyCalories) * (graphHeight - padding * 2), 2);
                                                const x = padding + idx * (barWidth + gap);
                                                const y = graphHeight - padding - barHeight;
                                                const isCurrentHour = idx === currentHour;
                                                
                                                return (
                                                   <G key={idx}>
                                                      <Path
                                                         d={`M ${x} ${y + barHeight} L ${x} ${y} Q ${x} ${y - 2} ${x + 2} ${y} L ${x + barWidth - 2} ${y} Q ${x + barWidth} ${y - 2} ${x + barWidth} ${y} L ${x + barWidth} ${y + barHeight} Z`}
                                                         fill={isCurrentHour ? hourlyBarGradient[0] : "url(#hourlyBarGradient)"}
                                                         opacity={isCurrentHour ? 1 : 0.8}
                                                      />
                                                      {isCurrentHour && (
                                                         <Circle
                                                            cx={x + barWidth / 2}
                                                            cy={y - 6}
                                                            r="4"
                                                            fill={hourlyBarGradient[0]}
                                                         />
                                                      )}
                                                   </G>
                                                );
                                             })}
                                          </Svg>
                                          <StyledView className="flex-row mt-3" style={{ paddingHorizontal: padding }}>
                                             {hourlyCalories.map((data, idx) => (
                                                <StyledText
                                                   key={idx}
                                                   className="text-[9px] font-semibold"
                                                   style={{
                                                      color: idx === currentHour ? hourlyBarGradient[0] : colors.text.secondary,
                                                      width: barWidth + gap,
                                                      textAlign: 'center',
                                                   }}
                                                >
                                                   {idx % 4 === 0 ? idx.toString().padStart(2, '0') : ''}
                                                </StyledText>
                                             ))}
                                          </StyledView>
                                       </StyledView>
                                    </Animated.ScrollView>
                                 );
                              })()}
                           </StyledView>
                        </StyledView>

                        <StyledView className="mt-6">
                           <StyledView className="flex-row justify-between items-center mb-3">
                              <StyledText className="text-[18px] font-bold tracking-tight" style={{ color: colors.text.primary }}>
                                 Last 7 days
                              </StyledText>
                              <StyledText className="text-[11px] font-semibold" style={{ color: colors.text.secondary }}>
                                 Moving average
                              </StyledText>
                           </StyledView>
                           <StyledView
                              className="mt-2 rounded-2xl p-5"
                              style={{
                                 backgroundColor: chartBackground,
                                 borderColor: colors.border.light,
                                 borderWidth: 1,
                                 height: chartHeight + 60,
                                 shadowColor: isDark ? '#000' : colors.accent.primary,
                                 shadowOffset: { width: 0, height: 2 },
                                 shadowOpacity: isDark ? 0.3 : 0.08,
                                 shadowRadius: 8,
                                 elevation: 3,
                              }}
                           >
                              {dailyCalories.length === 0 ? (
                                 <StyledView className="py-6 items-center">
                                    <StyledText className="text-sm" style={{ color: colors.text.secondary }}>
                                       We&apos;ll chart your calories once we have enough movement data.
                                    </StyledText>
                                 </StyledView>
                              ) : (() => {
                                 const padding = 30;
                                 const graphWidth = 280;
                                 const graphHeight = chartHeight;
                                 const points = dailyCalories.map((data, idx) => {
                                    const x = padding + (idx / (dailyCalories.length - 1)) * (graphWidth - padding * 2);
                                    const y = padding + (1 - data.calories / safeMaxDailyCalories) * (graphHeight - padding * 2);
                                    return { x, y, calories: data.calories, label: data.label };
                                 });
                                 
                                 // Create smooth curve using quadratic bezier
                                 let pathData = `M ${points[0].x} ${points[0].y}`;
                                 for (let i = 0; i < points.length - 1; i++) {
                                    const xMid = (points[i].x + points[i + 1].x) / 2;
                                    const yMid = (points[i].y + points[i + 1].y) / 2;
                                    pathData += ` Q ${points[i].x} ${points[i].y}, ${xMid} ${yMid}`;
                                    if (i === points.length - 2) {
                                       pathData += ` Q ${points[i + 1].x} ${points[i + 1].y}, ${points[i + 1].x} ${points[i + 1].y}`;
                                    }
                                 }
                                 const areaPath = `${pathData} L ${points[points.length - 1].x} ${graphHeight - padding} L ${points[0].x} ${graphHeight - padding} Z`;
                                 const todayIndex = dailyCalories.length - 1;
                                 
                                 return (
                                    <StyledView>
                                       <Svg width={graphWidth + 20} height={graphHeight + 20}>
                                          <Defs>
                                             <SvgLinearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                                                <Stop offset="0%" stopColor={dailyBarGradient[0]} stopOpacity="0.6" />
                                                <Stop offset="50%" stopColor={dailyBarGradient[0]} stopOpacity="0.3" />
                                                <Stop offset="100%" stopColor={dailyBarGradient[1]} stopOpacity="0.05" />
                                             </SvgLinearGradient>
                                             <SvgLinearGradient id="dailyLineGradient" x1="0" y1="0" x2="1" y2="0">
                                                <Stop offset="0%" stopColor={dailyBarGradient[0]} stopOpacity="0.8" />
                                                <Stop offset="100%" stopColor={dailyBarGradient[1]} stopOpacity="1" />
                                             </SvgLinearGradient>
                                          </Defs>
                                          {/* Horizontal guiding lines */}
                                          {[0.25, 0.5, 0.75].map((fraction, idx) => {
                                             const y = padding + (1 - fraction) * (graphHeight - padding * 2);
                                             return (
                                                <Line
                                                   key={`guide-${idx}`}
                                                   x1={padding}
                                                   y1={y}
                                                   x2={graphWidth - padding + 10}
                                                   y2={y}
                                                   stroke={colors.border.light}
                                                   strokeWidth="1"
                                                   strokeDasharray="4,4"
                                                   opacity="0.35"
                                                />
                                             );
                                          })}
                                          <Path d={areaPath} fill="url(#dailyGradient)" />
                                          <Path d={pathData} stroke="url(#dailyLineGradient)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                          {points.map((p, idx) => {
                                             const isToday = idx === todayIndex;
                                             return (
                                                <G key={idx}>
                                                   <Circle cx={p.x} cy={p.y} r={isToday ? 8 : 6} fill={dailyBarGradient[0]} opacity="0.3" />
                                                   <Circle cx={p.x} cy={p.y} r={isToday ? 6 : 5} fill={dailyBarGradient[0]} opacity="1" />
                                                   <Circle cx={p.x} cy={p.y} r={isToday ? 3 : 2.5} fill="white" />
                                                   {isToday && (
                                                      <Circle cx={p.x} cy={p.y} r="12" stroke={dailyBarGradient[0]} strokeWidth="2" fill="none" opacity="0.3" />
                                                   )}
                                                </G>
                                             );
                                          })}
                                       </Svg>
                                       <StyledView className="flex-row justify-between mt-3" style={{ width: graphWidth + 20 }}>
                                          {dailyCalories.map((data, idx) => {
                                             const isToday = idx === todayIndex;
                                             return (
                                                <StyledText
                                                   key={idx}
                                                   className="text-[10px] font-bold"
                                                   style={{
                                                      color: isToday ? dailyBarGradient[0] : colors.text.secondary,
                                                   }}
                                                >
                                                   {data.label.slice(0, 3)}
                                                </StyledText>
                                             );
                                          })}
                                       </StyledView>
                                    </StyledView>
                                 );
                              })()}
                           </StyledView>
                        </StyledView>
                        </>
                     )}
                  </Animated.View>
                  {!isCalorieExpanded && (
                     <StyledView className="mt-4 gap-3">
                        {calorieHighlights.map((highlight) => (
                           <StyledView
                              key={highlight.label}
                              className="flex-row justify-between items-center py-2"
                           >
                              <StyledText className="text-sm font-semibold" style={{ color: colors.text.secondary }}>
                                 {highlight.label}
                              </StyledText>
                              <StyledText className="text-sm font-bold" style={{ color: colors.text.primary }}>
                                 {highlight.value}
                              </StyledText>
                           </StyledView>
                        ))}
                     </StyledView>
                  )}
               </StyledView>
            </Animated.View>

            <Animated.View 
               entering={FadeInDown.duration(500).delay(140).springify()}
               exiting={FadeOutDown.duration(300)}
               layout={Layout.springify()}
               className="mb-4"
            >
               <StyledView
                  className="rounded-3xl p-5"
                  style={{
                     backgroundColor: colors.background.elevated,
                     borderColor: colors.border.medium,
                     borderWidth: 1,
                     shadowColor: isDark ? '#000' : '#1a1a1a',
                     shadowOffset: { width: 0, height: 8 },
                     shadowOpacity: isDark ? 0.5 : 0.15,
                     shadowRadius: 16,
                     elevation: 12,
                  }}
               >
                  <StyledView className="flex-row items-center justify-between mb-4">
                     <StyledText className="text-xl font-bold" style={{ color: colors.text.primary }}>
                        Route History
                     </StyledText>
                     <StyledView
                        className="px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: `${colors.accent.primary}20` }}
                     >
                        <StyledText className="text-xs font-semibold" style={{ color: colors.accent.primary }}>
                           {routeHistory.length ? `${routeHistory.length} TRACKED` : "SYNCING"}
                        </StyledText>
                     </StyledView>
                  </StyledView>
                  <StyledView className="mt-2">
                     {routeRows.map((row, index) => (
                        <StyledView
                           key={row.id}
                           className="flex-row items-center py-3"
                           style={{ borderBottomWidth: index === routeRows.length - 1 ? 0 : 1, borderColor: withAlpha(colors.text.secondary, "18") }}
                        >
                           <StyledView
                              className="w-12 h-12 rounded-2xl items-center justify-center"
                              style={{ backgroundColor: withAlpha(colors.accent.primary, isDark ? "22" : "18") }}
                           >
                              <MapPin size={18} color={colors.accent.primary} />
                           </StyledView>
                           <StyledView className="flex-1 ml-3">
                              <StyledText className="text-base font-semibold" style={{ color: colors.text.primary }}>
                                 {row.title}
                              </StyledText>
                              <StyledText className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                                 {row.subtitle}
                              </StyledText>
                           </StyledView>
                           {row.badge ? (
                              <StyledView
                                 className="px-3 py-1 rounded-full"
                                 style={{ backgroundColor: withAlpha(colors.accent.primary, "26") }}
                              >
                                 <StyledText className="text-[10px] font-semibold uppercase" style={{ color: colors.accent.primary }}>
                                    {row.badge}
                                 </StyledText>
                              </StyledView>
                           ) : null}
                        </StyledView>
                     ))}
                  </StyledView>
                  <StyledPressable
                     className="mt-4 rounded-2xl py-3 items-center"
                     style={{
                        backgroundColor: withAlpha(colors.text.primary, isDark ? "14" : "0D"),
                        borderColor: withAlpha(colors.text.secondary, "24"),
                        borderWidth: 1,
                     }}
                     onPress={handleRouteHistoryPress}
                  >
                     <StyledText className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                        View full history
                     </StyledText>
                  </StyledPressable>
               </StyledView>
            </Animated.View>

            <Animated.View 
               entering={FadeInDown.duration(500).delay(160).springify()}
               exiting={FadeOutDown.duration(300)}
               layout={Layout.springify()}
               className="mb-4"
            >
               <StyledView
                  className="rounded-3xl p-5"
                  style={{
                     backgroundColor: colors.background.elevated,
                     borderColor: colors.border.medium,
                     borderWidth: 1,
                     shadowColor: isDark ? '#000' : '#1a1a1a',
                     shadowOffset: { width: 0, height: 8 },
                     shadowOpacity: isDark ? 0.5 : 0.15,
                     shadowRadius: 16,
                     elevation: 12,
                  }}
               >
                  <StyledView className="flex-row items-center justify-between mb-4">
                     <StyledText className="text-xl font-bold" style={{ color: colors.text.primary }}>
                        Session Controls
                     </StyledText>
                     <StyledView
                        className="px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: `${isActive ? colors.status.error : colors.status.success}20` }}
                     >
                        <StyledText className="text-xs font-semibold" style={{ color: isActive ? colors.status.error : colors.status.success }}>
                           {isActive ? "TRACKING" : "READY"}
                        </StyledText>
                     </StyledView>
                  </StyledView>
                  <StyledText className="text-sm leading-relaxed" style={{ color: colors.text.secondary }}>
                     Tap start to track a focused walk. We&apos;ll keep counting even if you leave the screen.
                  </StyledText>

                  <StyledView className="gap-3">
                     {sessionSummaryTiles.map((tile) => {
                        const formattedValue = Number.isFinite(tile.value)
                           ? Number(tile.value).toLocaleString()
                           : String(tile.value);
                        return (
                           <StyledView
                              key={tile.label}
                              className="flex-row items-center justify-between py-2"
                           >
                              <StyledView className="flex-row items-center">
                                 <tile.Icon size={16} color={tile.accent} strokeWidth={2.5} />
                                 <StyledText className="text-sm font-semibold ml-2" style={{ color: colors.text.secondary }}>
                                    {tile.label}
                                 </StyledText>
                              </StyledView>
                              <StyledText className="text-lg font-bold" style={{ color: colors.text.primary }}>
                                 {formattedValue}
                              </StyledText>
                           </StyledView>
                        );
                     })}
                  </StyledView>

                  <StyledPressable
                     className="mt-4 rounded-2xl py-4 items-center justify-center"
                     onPress={handleToggleWalk}
                     style={{
                        backgroundColor: isActive ? colors.status.error : colors.status.success,
                     }}
                  >
                     <StyledText className="text-base font-bold" style={{ color: '#FFFFFF' }}>
                        {isActive ? "Stop Session" : "Start Session"}
                     </StyledText>
                  </StyledPressable>

                  <StyledView
                     className="mt-4 border-2 border-dashed rounded-2xl px-4 py-4"
                     style={{
                        borderColor: withAlpha(colors.accent.primary, "33"),
                        backgroundColor: withAlpha(colors.accent.primary, isDark ? "1A" : "12"),
                     }}
                  >
                     <StyledText className="text-xs" style={{ color: colors.text.secondary }}>
                        Raw total since midnight: <StyledText className="font-bold" style={{ color: colors.text.primary }}>{initialTodaySteps}</StyledText> steps • Sensor reading: <StyledText className="font-bold" style={{ color: colors.text.primary }}>{liveStepCount}</StyledText>
                     </StyledText>
                  </StyledView>
               </StyledView>
            </Animated.View>
         </Animated.ScrollView>
         </SafeAreaView>
      </ScreenWrapper>
   );
}

