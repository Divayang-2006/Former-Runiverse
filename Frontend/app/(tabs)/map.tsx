import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import Mapbox, {
  Camera,
  MapView,
  UserLocation,
  ShapeSource,
  LineLayer,
  FillLayer,
  FillExtrusionLayer,
  VectorSource,
} from "@rnmapbox/maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Constants from "expo-constants";
import polyline from "@mapbox/polyline";
import { authService } from "@/services/AuthService";
import { territoryService, type TerritoryFeature, type ClaimTerritoryPayload } from "@/services/territoryService";
import { routeService } from "@/services/routeService";
import TerrotorieEngine, { type Position } from "@/services/territoryEngine";
import { useStore } from "@/store/useStore";
import { Footprints, MapPin, Flame } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "../../context/ThemeContext";

Mapbox.setAccessToken(
  "pk.eyJ1IjoiaW1hZ2luZS14IiwiYSI6ImNtZXhnemd6ODAwZXIyanF0ZWhqM3BrM2IifQ.Leh68KuE8z7Lm70Ce60NLA"
);

const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const MAPBOX_LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const BUILDING_SOURCE_ID = "mapbox-buildings-source";
const BUILDING_3D_LAYER_ID = "mapbox-buildings-3d";
const BUILDING_SHADOW_LAYER_ID = "mapbox-buildings-shadows";

const ROUTE_STORAGE_KEY = "runiverse:inprogress_route_v1";
const MIN_ACCURACY_METERS = 50;
const MIN_TIME_BETWEEN_UPDATES_MS = 1000;
const MAX_REASONABLE_SPEED_MPS = 12;
const POLYLINE_SIMPLIFY_TOL = 0.00001;

type RawPoint = { lat: number; lon: number; ts: number };
type ProcessedSample = { coord: Position; ts: number };
type PersistedRouteSnapshot = {
  route: Position[];
  rawPoints: RawPoint[];
  savedAt: string;
  startedAt: number | null;
};

type TerritoryColorOption = {
  key: string;
  label: string;
  fill: string;
  stroke: string;
  fillOpacity: number;
};

const formatDistance = (meters: number) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

const estimateCalories = (meters: number) => Math.round(meters * 0.05);

const getUserColor = (
  userId: string | undefined,
  isCurrentUser: boolean
): { fill: string; stroke: string; fillOpacity: number } => {
  if (isCurrentUser) {
    return {
      fill: "rgba(0, 255, 0, 0.5)",
      stroke: "#00FF00",
      fillOpacity: 0.5,
    };
  }

  if (!userId) {
    return {
      fill: "rgba(128, 128, 128, 0.3)",
      stroke: "#808080",
      fillOpacity: 0.3,
    };
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const saturation = 70 + (Math.abs(hash) % 20);
  const lightness = 50 + (Math.abs(hash >> 8) % 15);

  return {
    fill: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.55)`,
    stroke: `hsl(${hue}, ${saturation}%, ${Math.max(lightness - 20, 30)}%)`,
    fillOpacity: 0.55,
  };
};

const haversineMeters = (aLon: number, aLat: number, bLon: number, bLat: number) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
};

class KalmanFilter2D {
  private state: [number, number, number, number] | null = null;
  private lastTimestamp: number | null = null;

  update(lat: number, lon: number, timestamp: number): [number, number] {
    if (!this.state) {
      this.state = [lat, lon, 0, 0];
      this.lastTimestamp = timestamp;
      return [lat, lon];
    }

    const dt = Math.max(1e-3, (timestamp - (this.lastTimestamp ?? timestamp)) / 1000);
    const [prevLat, prevLon, vLat, vLon] = this.state;
    const predictedLat = prevLat + vLat * dt;
    const predictedLon = prevLon + vLon * dt;
    const residualLat = lat - predictedLat;
    const residualLon = lon - predictedLon;
    const gainLat = 0.5;
    const gainLon = 0.5;
    const nextLat = predictedLat + gainLat * residualLat;
    const nextLon = predictedLon + gainLon * residualLon;
    const nextVlat = 0.6 * vLat + 0.4 * (residualLat / dt);
    const nextVlon = 0.6 * vLon + 0.4 * (residualLon / dt);
    this.state = [nextLat, nextLon, nextVlat, nextVlon];
    this.lastTimestamp = timestamp;
    return [nextLat, nextLon];
  }
}

const movingAverageSmooth = (points: Position[], window = 3): Position[] => {
  if (points.length < window) return points.slice();
  const half = Math.floor(window / 2);
  return points.map((_, idx) => {
    let count = 0;
    let sumLon = 0;
    let sumLat = 0;
    for (let j = Math.max(0, idx - half); j <= Math.min(points.length - 1, idx + half); j += 1) {
      sumLon += points[j][0];
      sumLat += points[j][1];
      count += 1;
    }
    return [sumLon / count, sumLat / count] as Position;
  });
};

const ensureTodaySnapshot = (snapshot: PersistedRouteSnapshot | null) => {
  if (!snapshot?.savedAt) {
    return snapshot;
  }
  const today = new Date().toISOString().slice(0, 10);
  const savedDay = snapshot.savedAt.slice(0, 10);
  return today === savedDay ? snapshot : null;
};

export default function MapScreen() {
  const user = useStore((s) => s.user);
  const { colors, isDark } = useTheme();
  const [location, setLocation] = useState<Position | null>(null);
  const [route, setRoute] = useState<Position[]>([]);
  const [ownedTerritories, setOwnedTerritories] = useState<TerritoryFeature[]>([]);
  const [otherTerritories, setOtherTerritories] = useState<TerritoryFeature[]>([]);
  const [showBuildings, setShowBuildings] = useState(true);
  const [routeDistance, setRouteDistance] = useState(0);
  const [userTerritoriesCount, setUserTerritoriesCount] = useState(0);
  
  const combinedTerritories = useMemo(() => [...ownedTerritories, ...otherTerritories], [ownedTerritories, otherTerritories]);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const stickyBottomOffset = useMemo(() => insets.bottom + tabBarHeight + 12, [insets.bottom, tabBarHeight]);
  const legendBottomOffset = useMemo(() => stickyBottomOffset + 72, [stickyBottomOffset]);
  
  const cameraRef = useRef<Camera>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const territoryEngineRef = useRef<TerrotorieEngine | null>(null);
  const kalmanRef = useRef<KalmanFilter2D | null>(null);
  const rawPointsRef = useRef<RawPoint[]>([]);
  const processedSamplesRef = useRef<ProcessedSample[]>([]);
  const routeStartRef = useRef<number | null>(null);
  const hasCenteredRef = useRef(false);
  const lastTerritoryFetchRef = useRef<number>(0);
  
  useEffect(() => {
    if (!territoryEngineRef.current) {
      territoryEngineRef.current = new TerrotorieEngine({
        minDistanceMeters: 6,
        simplifyTolerance: POLYLINE_SIMPLIFY_TOL,
        minSegmentSamples: 6,
        minLoopAreaMeters: 10,
      });
    }
  }, []);
  
  const getProcessedRoute = useCallback(() => processedSamplesRef.current.map((sample) => sample.coord), []);
  
  const persistRouteSnapshot = useCallback(async () => {
    try {
      const coords = getProcessedRoute();
      if (!coords.length) {
        await AsyncStorage.removeItem(ROUTE_STORAGE_KEY);
        return;
      }
      const snapshot: PersistedRouteSnapshot = {
        route: coords,
        rawPoints: rawPointsRef.current,
        savedAt: new Date().toISOString(),
        startedAt: routeStartRef.current ?? null,
      };
      await AsyncStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("persistRouteSnapshot error", error);
    }
  }, [getProcessedRoute]);

  const saveCompletedRoute = useCallback(async () => {
    try {
      const samples = processedSamplesRef.current;
      if (samples.length < 2) {
        return;
      }
      
      const processedPoints = samples.map((sample) => ({
        lon: sample.coord[0],
        lat: sample.coord[1],
        ts: sample.ts,
      }));
      const rawPoints = rawPointsRef.current.map((point) => ({
        lon: point.lon,
        lat: point.lat,
        ts: point.ts,
      }));
      
      let encodedPolyline = "";
      if (samples.length > 0) {
        try {
          encodedPolyline = polyline.encode(samples.map((sample) => [sample.coord[1], sample.coord[0]]));
        } catch (encodeErr) {
          console.warn("Polyline encoding failed, proceeding without", encodeErr);
        }
      }
      
      const startedAt = routeStartRef.current ?? undefined;
      const endedAt = samples[samples.length - 1]?.ts ?? Date.now();
      const durationSeconds = startedAt ? Math.max(0, Math.round((endedAt - startedAt) / 1000)) : undefined;
      
      await routeService.saveRoute({
        processedPoints,
        rawPoints,
        encodedPolyline,
        startedAt,
        endedAt,
        distanceMeters: routeDistance || undefined,
        durationSeconds,
      });
    } catch (error) {
      console.warn("saveCompletedRoute error", error);
    }
  }, [routeDistance]);
  
  const hydrateSavedRoute = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ROUTE_STORAGE_KEY);
      if (!raw) return;
      const parsed = ensureTodaySnapshot(JSON.parse(raw) as PersistedRouteSnapshot | null);
      if (!parsed?.route?.length) {
        await AsyncStorage.removeItem(ROUTE_STORAGE_KEY);
        return;
      }
      processedSamplesRef.current = parsed.route.map((coord, idx) => ({
        coord,
        ts: parsed.rawPoints?.[idx]?.ts ?? Date.now(),
      }));
      rawPointsRef.current = parsed.rawPoints ?? [];
      routeStartRef.current = parsed.startedAt ?? null;
      setRoute(parsed.route);
      territoryEngineRef.current?.seedRoute(parsed.route);
    } catch (error) {
      console.warn("hydrateSavedRoute error", error);
    }
  }, []);
  
  const loadTerritories = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastTerritoryFetchRef.current < 5000) {
        return;
      }
      lastTerritoryFetchRef.current = now;
      
      const fetched = await territoryService.fetchTerritories("all");
      if (!Array.isArray(fetched)) {
        console.warn("Invalid territories response");
        return;
      }
      
      const owned = [];
      const others = [];
      for (let i = 0; i < fetched.length; i++) {
        const feature = fetched[i];
        const ownerId = feature?.properties?.owner?._id || feature?.properties?.owner?.id;
        if (ownerId === user?.id) {
          owned.push(feature);
        } else {
          others.push(feature);
        }
      }
      
      setOwnedTerritories(owned);
      setOtherTerritories(others);
      setUserTerritoriesCount(owned.length);
    } catch (error) {
      console.warn("Failed to load territories", error);
    }
  }, [user?.id]);
  
  const updateOwnedTerritories = useCallback((updater: (prev: TerritoryFeature[]) => TerritoryFeature[]) => {
    setOwnedTerritories((prev) => {
      const next = updater(prev);
      setUserTerritoriesCount(next.length);
      return next;
    });
  }, []);
  
  const handleTerritoryPersist = useCallback(async (feature: any) => {
    if (!feature?.geometry?.coordinates?.[0]?.length) {
      return;
    }
    
    try {
      const processedPoints = processedSamplesRef.current.map((sample) => ({
        lon: sample.coord[0],
        lat: sample.coord[1],
        ts: sample.ts,
      }));
      const rawPointsPayload = rawPointsRef.current.map((point) => ({
        lon: point.lon,
        lat: point.lat,
        ts: point.ts,
      }));
      
      let encodedPolyline = "";
      if (processedSamplesRef.current.length > 0) {
        try {
          encodedPolyline = polyline.encode(processedSamplesRef.current.map((sample) => [sample.coord[1], sample.coord[0]]));
        } catch (encodeErr) {
          console.warn("Territory polyline encoding failed", encodeErr);
        }
      }
      
      const payload: ClaimTerritoryPayload = {
        name: feature?.properties?.name ?? `Territory ${new Date().toLocaleTimeString()}`,
        geometry: feature.geometry,
        area: feature?.properties?.area ?? null,
        perimeter: feature?.properties?.perimeter ?? null,
        processedPoints,
        rawPoints: rawPointsPayload,
        encodedPolyline,
        deviceInfo: {
          platform: Platform.OS,
          appVersion: Constants?.expoConfig?.version ?? "unknown",
        },
      };
      
      const saved = await territoryService.claimTerritory(payload);
      updateOwnedTerritories((prev) => [...prev, saved]);
    } catch (error: any) {
      console.error("Territory save failed", error);
      Alert.alert("Territory", error?.message ?? "Failed to save territory");
    }
  }, [updateOwnedTerritories]);
  
  const handleLocationUpdate = useCallback(async (loc: Location.LocationObject) => {
    try {
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      const ts = loc.timestamp ?? Date.now();
      
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return;
      }
      
      rawPointsRef.current.push({ lat, lon, ts });
      
      if (loc.coords.accuracy && loc.coords.accuracy > MIN_ACCURACY_METERS) {
        return;
      }
      
      if (!kalmanRef.current) {
        kalmanRef.current = new KalmanFilter2D();
      }
      
      const [sLat, sLon] = kalmanRef.current.update(lat, lon, ts);
      
      const lastSample = processedSamplesRef.current[processedSamplesRef.current.length - 1];
      if (lastSample) {
        const distanceMeters = haversineMeters(lastSample.coord[0], lastSample.coord[1], sLon, sLat);
        const dtSeconds = Math.max(1, (ts - lastSample.ts) / 1000);
        const speed = distanceMeters / dtSeconds;
        if (speed > MAX_REASONABLE_SPEED_MPS) {
          console.warn("Ignored spike", speed);
          return;
        }
      }
      
      processedSamplesRef.current.push({ coord: [sLon, sLat], ts });
      setRoute(getProcessedRoute());
      setLocation([sLon, sLat]);
      
      if (!routeStartRef.current) {
        routeStartRef.current = ts;
      }
      
      if (processedSamplesRef.current.length % 10 === 0) {
        await persistRouteSnapshot();
      }
      
      const engine = territoryEngineRef.current;
      if (engine && processedSamplesRef.current.length % 3 === 0) {
        try {
          const result = engine.handleNewCoordinate({ latitude: sLat, longitude: sLon, timestamp: ts });
          if (result?.createdTerritory) {
            await handleTerritoryPersist(result.createdTerritory);
          }
        } catch (engineErr) {
          console.warn("Engine error", engineErr);
        }
      }
    } catch (error) {
      console.warn("onLocationUpdate error", error);
    }
  }, [getProcessedRoute, handleTerritoryPersist, persistRouteSnapshot]);
  
  const finalizeTracking = useCallback(async () => {
    try {
      if (!processedSamplesRef.current.length) {
        await AsyncStorage.removeItem(ROUTE_STORAGE_KEY);
        return;
      }
      const smoothed = movingAverageSmooth(getProcessedRoute(), 3);
      processedSamplesRef.current = smoothed.map((coord, idx) => ({
        coord,
        ts: processedSamplesRef.current[idx]?.ts ?? Date.now(),
      }));
      setRoute(smoothed);
      const engine = territoryEngineRef.current;
      if (engine) {
        engine.seedRoute(smoothed);
        const result = engine.finalizeAfterRun();
        if (result?.createdTerritory) {
          await handleTerritoryPersist(result.createdTerritory);
        }
      }
      await persistRouteSnapshot();
      await saveCompletedRoute();
    } catch (error) {
      console.warn("finalizeTracking error", error);
    }
  }, [getProcessedRoute, handleTerritoryPersist, persistRouteSnapshot, saveCompletedRoute]);
  
  const startTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location", "Permission to access location was denied");
        return;
      }
      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: MIN_TIME_BETWEEN_UPDATES_MS,
          distanceInterval: 1,
          mayShowUserSettingsDialog: true,
        },
        (loc) => {
          void handleLocationUpdate(loc);
        }
      );
    } catch (error) {
      console.warn("startTracking error", error);
    }
  }, [handleLocationUpdate]);
  
  useEffect(() => {
    authService.hydrate().catch(() => undefined);
    hydrateSavedRoute();
    loadTerritories();
    startTracking();
    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
      void finalizeTracking();
    };
  }, [finalizeTracking, hydrateSavedRoute, loadTerritories, startTracking]);
  
  useFocusEffect(
    useCallback(() => {
      loadTerritories();
      return () => {
        void persistRouteSnapshot();
      };
    }, [loadTerritories, persistRouteSnapshot])
  );
  
  useEffect(() => {
    if (route.length > 1) {
      let total = 0;
      for (let i = 1; i < route.length; i += 1) {
        total += distance(route[i - 1], route[i]);
      }
      setRouteDistance(total);
    } else {
      setRouteDistance(0);
    }
  }, [route]);
  
  useEffect(() => {
    if (!location || !cameraRef.current || hasCenteredRef.current) {
      return;
    }
    cameraRef.current.setCamera({
      centerCoordinate: location,
      zoomLevel: 17,
      pitch: 60,
      heading: 0,
      animationDuration: 800,
    });
    hasCenteredRef.current = true;
  }, [location]);
  
  const userColorOptions: TerritoryColorOption[] = useMemo(
    () => [
      {
        key: "emerald",
        label: "Emerald",
        fill: "rgba(34, 197, 94, 0.6)",
        stroke: "#22C55E",
        fillOpacity: 0.6,
      },
      {
        key: "sky",
        label: "Sky",
        fill: "rgba(59, 130, 246, 0.55)",
        stroke: "#3B82F6",
        fillOpacity: 0.55,
      },
      {
        key: "violet",
        label: "Violet",
        fill: "rgba(139, 92, 246, 0.58)",
        stroke: "#8B5CF6",
        fillOpacity: 0.58,
      },
      {
        key: "rose",
        label: "Rose",
        fill: "rgba(244, 63, 94, 0.56)",
        stroke: "#F43F5E",
        fillOpacity: 0.56,
      },
    ],
    []
  );
  
  const defaultUserColor = userColorOptions[0];
  const [userTerritoryColor, setUserTerritoryColor] = useState<TerritoryColorOption>(defaultUserColor);
  
  const territoryLegend = useMemo(() => {
    const entries = new Map<string, { id: string; name: string; swatch: string; isCurrent: boolean }>();
    
    if (!Array.isArray(combinedTerritories)) {
      return [];
    }
    
    for (let idx = 0; idx < combinedTerritories.length; idx++) {
      const territory = combinedTerritories[idx];
      if (!territory?.properties) {
        continue;
      }
      
      const owner = territory.properties.owner;
      const ownerId = owner?._id || owner?.id || "unknown";
      
      if (entries.has(ownerId)) {
        continue;
      }
      
      const isCurrentOwner = ownerId !== "unknown" && ownerId === user?.id;
      const displayName = isCurrentOwner ? "You" : owner?.username || owner?.displayName || owner?.name || "Unknown Owner";
      const palette = getUserColor(ownerId === "unknown" ? undefined : ownerId, isCurrentOwner);
      const swatchColor = isCurrentOwner ? userTerritoryColor.stroke : palette.stroke;
      
      entries.set(ownerId, {
        id: ownerId,
        name: displayName,
        swatch: swatchColor,
        isCurrent: isCurrentOwner,
      });
    }
    
    return Array.from(entries.values());
  }, [combinedTerritories, user?.id, userTerritoryColor.stroke]);
  
  const statsGradient = (isDark ? colors.gradients.sunsetGlow : colors.gradients.tropicalParadise) as readonly string[];
  const statsGradientColors = [...statsGradient] as [string, string, ...string[]];
  const toggleBackground = isDark ? "rgba(15,15,15,0.7)" : "rgba(255,255,255,0.85)";
  const toggleBorder = isDark ? "rgba(148,163,184,0.4)" : "rgba(148,163,184,0.6)";
  const toggleActiveBackground = isDark ? "#0EA5E9" : "#38BDF8";
  const toggleTextColor = isDark ? "#F8FAFC" : "#0F172A";
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['bottom', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background.primary, paddingTop: insets.top + 8 }}>
        {/* Render MapView only if user is loaded to avoid crashes */}
        {user ? (
          <MapView
            style={{ flex: 1 }}
            styleURL={isDark ? MAPBOX_DARK_STYLE : MAPBOX_LIGHT_STYLE}
            compassEnabled
            pitchEnabled
            rotateEnabled
            zoomEnabled
            onDidFinishLoadingStyle={() => {
              console.log(`${isDark ? 'Dark' : 'Light'} map style loaded`);
            }}
          >
            {showBuildings && (
            <VectorSource id={BUILDING_SOURCE_ID} url="mapbox://mapbox.mapbox-streets-v8">
              <FillExtrusionLayer
                id={BUILDING_3D_LAYER_ID}
                sourceID={BUILDING_SOURCE_ID}
                sourceLayerID="building"
                minZoomLevel={13}
                maxZoomLevel={22}
                style={{
                  fillExtrusionColor: isDark
                    ? [
                        'interpolate',
                        ['linear'],
                        ['get', 'height'],
                        0,
                        '#4f5b66',
                        50,
                        '#697887',
                        150,
                        '#92a4b2',
                      ]
                    : [
                        'interpolate',
                        ['linear'],
                        ['get', 'height'],
                        0,
                        '#CBD5F5',
                        50,
                        '#A5B4FC',
                        150,
                        '#818CF8',
                      ],
                  fillExtrusionHeight: [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    13,
                    0,
                    13.05,
                    ['coalesce', ['get', 'height'], 5],
                    18,
                    ['*', ['coalesce', ['get', 'height'], 5], 1.5],
                    22,
                    ['*', ['coalesce', ['get', 'height'], 5], 2],
                  ],
                  fillExtrusionBase: [['coalesce', ['get', 'min_height'], 0]],
                  fillExtrusionOpacity: isDark ? 0.92 : 0.85,
                }}
              />
              <FillLayer
                id={BUILDING_SHADOW_LAYER_ID}
                sourceID={BUILDING_SOURCE_ID}
                sourceLayerID="building"
                style={{
                  fillColor: isDark ? '#000' : '#CBD5F5',
                  fillOpacity: [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    13,
                    0,
                    14,
                    isDark ? 0.08 : 0.06,
                    17,
                    isDark ? 0.15 : 0.1,
                  ],
                  fillTranslate: [6, 6],
                  fillTranslateAnchor: 'map',
                }}
              />
            </VectorSource>
          )}

          {route.length > 1 && (
            <ShapeSource
              id="routeSource"
              shape={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: route,
                },
              }}
            >
              <LineLayer
                id="routeLine"
                style={{
                  lineColor: '#00FF00',
                  lineWidth: 4,
                  lineOpacity: 0.8,
                }}
              />
            </ShapeSource>
          )}

          {combinedTerritories.map((territory, index) => {
            const featureKey = territory.properties?.id ?? territory.properties?.localId ?? index;
            const ownerId = territory.properties?.owner?._id || territory.properties?.owner?.id;
            const isCurrentUser = ownerId === user?.id;
            const palette = getUserColor(ownerId, isCurrentUser);
            const fillColor = isCurrentUser ? userTerritoryColor.fill : palette.fill;
            const strokeColor = isCurrentUser ? userTerritoryColor.stroke : palette.stroke;
            const fillOpacity = isCurrentUser ? userTerritoryColor.fillOpacity : palette.fillOpacity;
            return (
              <ShapeSource key={`territory-${featureKey}`} id={`territory-${featureKey}`} shape={territory}>
                <FillLayer
                  id={`territory-fill-${featureKey}`}
                  style={{
                    fillColor,
                    fillOutlineColor: strokeColor,
                    fillOpacity,
                  }}
                />
                <LineLayer
                  id={`territory-line-${featureKey}`}
                  style={{
                    lineColor: strokeColor,
                    lineWidth: isCurrentUser ? 4 : 3,
                    lineOpacity: isCurrentUser ? 1 : 0.8,
                  }}
                />
              </ShapeSource>
            );
          })}

          <UserLocation visible showsUserHeadingIndicator androidRenderMode="normal" />
          <Camera
            ref={cameraRef}
            followUserLocation
            followZoomLevel={17}
            followPitch={60}
            followHeading={0}
            animationMode="flyTo"
            animationDuration={2000}
          />
        </MapView>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary }}>
            <Text style={{ color: colors.text.primary }}>Loading user data...</Text>
          </View>
        )}

        <View style={[styles.controls, { left: insets.left + 16, top: insets.top + 20 }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                backgroundColor: showBuildings ? toggleActiveBackground : toggleBackground,
                borderColor: showBuildings ? toggleActiveBackground : toggleBorder,
              },
            ]}
            onPress={() => setShowBuildings((prev) => !prev)}
          >
            <Text style={[styles.toggleText, { color: toggleTextColor }]}>{showBuildings ? 'Hide 3D' : 'Show 3D'}</Text>
          </TouchableOpacity>
        </View>

        {territoryLegend.length > 0 && (
          <View
            style={[
              styles.legendContainer,
              {
                bottom: legendBottomOffset,
                left: insets.left + 12,
                backgroundColor: isDark ? 'rgba(17, 24, 39, 0.78)' : 'rgba(255, 255, 255, 0.92)',
                borderColor: isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(148, 163, 184, 0.35)',
                shadowColor: isDark ? '#000000' : '#1E293B',
                shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 10 },
                shadowRadius: 18,
                elevation: 10,
              },
            ]}
          >
            <Text style={[styles.legendTitle, { color: isDark ? '#E2E8F0' : '#0F172A' }]}>Territory Owners</Text>
            {territoryLegend.map((entry) => {
              const isCurrentOwner = entry.isCurrent;
              return (
                <View key={entry.id} style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendSwatch,
                      {
                        backgroundColor: entry.swatch,
                        borderColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15, 23, 42, 0.2)',
                      },
                    ]}
                  />
                  <Text style={[styles.legendLabel, { color: isDark ? '#F8FAFC' : '#1F2937' }]}>{entry.name}</Text>
                  {isCurrentOwner && (
                    <View style={styles.legendColorPicker}>
                      {userColorOptions.map((option) => {
                        const isSelected = option.key === userTerritoryColor.key;
                        const fallbackBorder = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15, 23, 42, 0.25)';
                        return (
                          <TouchableOpacity
                            key={option.key}
                            onPress={() => setUserTerritoryColor(option)}
                            style={[
                              styles.legendColorOption,
                              {
                                borderColor: isSelected ? option.stroke : fallbackBorder,
                                backgroundColor: option.fill,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Animated.View
          entering={FadeInDown.duration(800).delay(300)}
          style={[
            styles.stickyBottomBar,
            {
              bottom: stickyBottomOffset,
              left: insets.left + 8,
              right: insets.right + 8,
            },
          ]}
        >
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ borderRadius: 24, overflow: 'hidden' }}>
            <LinearGradient colors={statsGradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientContainer}>
              <View style={styles.statItem}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <MapPin size={18} color="#fff" strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statValue}>{formatDistance(routeDistance)}</Text>
                </View>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Flame size={18} color="#FFD700" strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={styles.statLabel}>Your Territories</Text>
                  <Text style={styles.statValue}>{userTerritoriesCount}</Text>
                </View>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Footprints size={18} color="#fff" strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={styles.statLabel}>Calories</Text>
                  <Text style={styles.statValue}>{estimateCalories(routeDistance)}</Text>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    top: 12,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'relative',
    top: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  toggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stickyBottomBar: {
    position: 'absolute',
    zIndex: 50,
  },
  legendContainer: {
    position: 'absolute',
    zIndex: 45,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    maxWidth: 260,
    alignSelf: 'flex-start',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  legendColorPicker: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 6,
  },
  legendColorOption: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  gradientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 12,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

function distance(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
