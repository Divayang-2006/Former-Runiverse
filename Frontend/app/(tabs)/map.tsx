import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Mapbox, { Camera, MapView, UserLocation, ShapeSource, LineLayer, FillLayer, FillExtrusionLayer, VectorSource } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { authService } from "@/services/AuthService";
import {
   isClosedLoop,
   pathLengthMeters,
   polygonAreaMeters2,
} from "@/utils/loopDetection";
import { territoryService, TerritoryFeature } from "@/services/territoryService";

type LocalRouteSnapshot = {
   date: string;
   route: [number, number][];
   startedAt: number | null;
};

const ROUTE_STORAGE_KEY = "runiverse:map:last-route";

Mapbox.setAccessToken(
   'pk.eyJ1IjoiaW1hZ2luZS14IiwiYSI6ImNtZXhnemd6ODAwZXIyanF0ZWhqM3BrM2IifQ.Leh68KuE8z7Lm70Ce60NLA'
);

const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

// Mapbox Streets vector source + layer identifiers for 3D buildings
const BUILDING_SOURCE_ID = 'mapbox-buildings-source';
const BUILDING_3D_LAYER_ID = 'mapbox-buildings-3d';
const BUILDING_SHADOW_LAYER_ID = 'mapbox-buildings-shadows';

// Tracking tuning
const MIN_ACCURACY_METERS = 25;
const MIN_DISTANCE_DELTA_METERS = 3;
const MIN_SPEED_MS = 0.4;
const MIN_TIME_BETWEEN_UPDATES_MS = 750;
const SMOOTHING_ALPHA = 0.25;

export default function MapScreen() {
   const [location, setLocation] = useState<[number, number] | null>(null);
   const [route, setRoute] = useState<[number, number][]>([]);
   const [territories, setTerritories] = useState<TerritoryFeature[]>([]);
   const [showBuildings, setShowBuildings] = useState(true);
   const routeStartRef = useRef<number | null>(null);
   const routeRef = useRef<[number, number][]>([]);
   const cameraRef = useRef<Camera>(null);
   const watchRef = useRef<Location.LocationSubscription | null>(null);
   const prevAcceptedCoordRef = useRef<[number, number] | null>(null);
   const lastTimestampRef = useRef<number | null>(null);
   const hasCenteredRef = useRef(false);
   const insets = useSafeAreaInsets();

   const persistRoute = useCallback(async (coords: [number, number][]) => {
      try {
         if (!coords.length) {
            await AsyncStorage.removeItem(ROUTE_STORAGE_KEY);
            return;
         }

         const snapshot: LocalRouteSnapshot = {
            date: new Date().toISOString().slice(0, 10),
            route: coords,
            startedAt: routeStartRef.current ?? Date.now(),
         };

         await AsyncStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(snapshot));
      } catch (error) {
         console.warn("Failed to persist route", error);
      }
   }, []);

   const hydrateRoute = useCallback(async () => {
      try {
         const stored = await AsyncStorage.getItem(ROUTE_STORAGE_KEY);
         if (!stored) {
            return;
         }

         const parsed: LocalRouteSnapshot = JSON.parse(stored);
         const todayKey = new Date().toISOString().slice(0, 10);

         if (parsed.date !== todayKey || !Array.isArray(parsed.route)) {
            await AsyncStorage.removeItem(ROUTE_STORAGE_KEY);
            return;
         }

         routeRef.current = parsed.route;
         routeStartRef.current = typeof parsed.startedAt === "number" ? parsed.startedAt : Date.now();
         setRoute(parsed.route);
      } catch (error) {
         console.warn("Failed to hydrate saved route", error);
      }
   }, []);

   const loadTerritories = useCallback(async () => {
      try {
         const fetched = await territoryService.fetchTerritories();
         setTerritories(fetched);
      } catch (error) {
         console.warn("Failed to load territories", error);
      }
   }, []);

   const submitTerritory = useCallback(
      (closedPolygon: [number, number][], area: number, length: number) => {
         const localId = `local-${Date.now()}`;
         const optimistic: TerritoryFeature = {
            type: "Feature",
            geometry: {
               type: "Polygon",
               coordinates: [closedPolygon],
            },
            properties: {
               localId,
               area,
               length,
               claimedOn: new Date().toISOString(),
            },
         };

         setTerritories((prevT) => [...prevT, optimistic]);

         territoryService
            .claimTerritory({
               name: `Territory ${new Date().toISOString()}`,
               coordinates: closedPolygon,
               area,
               length,
            })
            .then((saved) => {
               setTerritories((prevT) =>
                  prevT.map((territory) =>
                     territory.properties?.localId === localId ? saved : territory
                  )
               );
            })
            .catch((error) => {
               console.warn("Territory save failed", error);
               setTerritories((prevT) =>
                  prevT.filter((territory) => territory.properties?.localId !== localId)
               );
            });
      },
      []
   );

   const handleLocationUpdate = useCallback(
      (loc: Location.LocationObject) => {
         const { accuracy } = loc.coords;
         const speed = loc.coords.speed ?? 0;

         if (accuracy && accuracy > MIN_ACCURACY_METERS) {
            return;
         }

         const timestamp = loc.timestamp ?? Date.now();
         if (lastTimestampRef.current && timestamp - lastTimestampRef.current < MIN_TIME_BETWEEN_UPDATES_MS) {
            return;
         }
         lastTimestampRef.current = timestamp;

         const rawCoord: [number, number] = [loc.coords.longitude, loc.coords.latitude];
         const smoothedCoord = smoothCoordinate(prevAcceptedCoordRef.current, rawCoord);
         prevAcceptedCoordRef.current = smoothedCoord;
         setLocation(smoothedCoord);

         let nextRoute: [number, number][] | null = null;

         setRoute((prev) => {
            if (prev.length === 0) {
               routeStartRef.current = Date.now();
               nextRoute = [smoothedCoord];
               return nextRoute;
            }

            const lastCoord = prev[prev.length - 1];
            const distToLast = distance(lastCoord, smoothedCoord);

            if (distToLast < MIN_DISTANCE_DELTA_METERS && speed < MIN_SPEED_MS) {
               nextRoute = prev;
               return prev;
            }

            const newPath = [...prev, smoothedCoord];

            if (isClosedLoop(newPath, routeStartRef.current)) {
               const area = polygonAreaMeters2(newPath);
               const MIN_AREA = 100;

               if (area > MIN_AREA) {
                  const closedPolygon = [...newPath, newPath[0]];
                  const length = pathLengthMeters(newPath);
                  submitTerritory(closedPolygon, area, length);
               }

               routeStartRef.current = null;
               nextRoute = [];
               return [];
            }

            nextRoute = newPath;
            return newPath;
         });

         if (nextRoute !== null) {
            const hasChanged = nextRoute !== routeRef.current;
            routeRef.current = nextRoute;
            if (hasChanged) {
               persistRoute(nextRoute);
            }
         }
      },
      [persistRoute, submitTerritory]
   );

   useEffect(() => {
      routeRef.current = route;
   }, [route]);

   useEffect(() => {
      let isMounted = true;

      const startTracking = async () => {
         const { status } = await Location.requestForegroundPermissionsAsync();
         if (status !== "granted") {
            alert("Permission to access location was denied");
            return;
         }

         try {
            await Location.enableNetworkProviderAsync();
         } catch (err) {
            console.warn('Network provider enable failed', err);
         }

         watchRef.current?.remove();
         watchRef.current = await Location.watchPositionAsync(
            {
               accuracy: Location.Accuracy.BestForNavigation,
               timeInterval: MIN_TIME_BETWEEN_UPDATES_MS,
               distanceInterval: Math.max(1, MIN_DISTANCE_DELTA_METERS - 1),
               mayShowUserSettingsDialog: true,
            },
            (loc) => {
               if (!isMounted) return;
               handleLocationUpdate(loc);
            }
         );
      };

   authService.hydrate().catch(() => undefined);
   hydrateRoute();
      startTracking();
      loadTerritories();

      return () => {
         isMounted = false;
         watchRef.current?.remove();
         watchRef.current = null;
         void persistRoute(routeRef.current);
      };
   }, [handleLocationUpdate, hydrateRoute, loadTerritories, persistRoute]);

   useFocusEffect(
      useCallback(() => {
         loadTerritories();
         return () => {
            void persistRoute(routeRef.current);
         };
      }, [loadTerritories, persistRoute])
   );

   useEffect(() => {
      if (!location || !cameraRef.current) {
         return;
      }

      if (!hasCenteredRef.current) {
         cameraRef.current.setCamera({
            centerCoordinate: location,
            zoomLevel: 17,
            pitch: 60,
            heading: 0,
            animationDuration: 800,
         });
         hasCenteredRef.current = true;
      }
   }, [location]);
   return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['bottom', 'left', 'right']}>
         <StatusBar style="auto" />
         <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top + 8 }}>
            <MapView
               style={{ flex: 1 }}
               styleURL={MAPBOX_DARK_STYLE}
               compassEnabled={true}
               pitchEnabled={true}
               rotateEnabled={true}
               zoomEnabled={true}
               onDidFinishLoadingStyle={() => {
                  console.log('Dark map style loaded with custom 3D buildings');
               }}
            >
               {/* Global 3D Buildings from Mapbox Streets */}
               {showBuildings && (
                  <VectorSource id={BUILDING_SOURCE_ID} url="mapbox://mapbox.mapbox-streets-v8">
                     <FillExtrusionLayer
                        id={BUILDING_3D_LAYER_ID}
                        sourceID={BUILDING_SOURCE_ID}
                        sourceLayerID="building"
                        minZoomLevel={13}
                        maxZoomLevel={22}
                        style={{
                           fillExtrusionColor: [
                              'interpolate', ['linear'], ['get', 'height'],
                              0, '#4f5b66',
                              50, '#697887',
                              150, '#92a4b2'
                           ],
                           fillExtrusionHeight: [
                              'interpolate', ['linear'], ['zoom'],
                              13, 0,
                              13.05, ['coalesce', ['get', 'height'], 5],
                              18, ['*', ['coalesce', ['get', 'height'], 5], 1.5],
                              22, ['*', ['coalesce', ['get', 'height'], 5], 2]
                           ],
                           fillExtrusionBase: [
                              'coalesce', ['get', 'min_height'], 0
                           ],
                           fillExtrusionOpacity: 0.92,
                        }}
                     />
                     <FillLayer
                        id={BUILDING_SHADOW_LAYER_ID}
                        sourceID={BUILDING_SOURCE_ID}
                        sourceLayerID="building"
                        style={{
                           fillColor: '#000',
                           fillOpacity: [
                              'interpolate', ['linear'], ['zoom'],
                              13, 0,
                              14, 0.08,
                              17, 0.15
                           ],
                           fillTranslate: [6, 6],
                           fillTranslateAnchor: 'map'
                        }}
                     />
                  </VectorSource>
               )}

               {/* Current route line */}
               {route.length > 1 && (
                  <ShapeSource
                     id="routeSource"
                     shape={{
                        type: "Feature",
                        properties: {},
                        geometry: {
                           type: "LineString",
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
               {/* Territories */}
               {territories.map((territory, index) => {
                  const featureKey = territory.properties?.id ?? territory.properties?.localId ?? index;
                  return (
                     <ShapeSource key={`territory-${featureKey}`} id={`territory-${featureKey}`} shape={territory}>
                        <FillLayer
                           id={`territory-fill-${featureKey}`}
                           style={{
                              fillColor: "rgba(255,0,0,0.4)",
                              fillOutlineColor: "red",
                           }}
                        />
                        <LineLayer
                           id={`territory-line-${featureKey}`}
                           style={{
                              lineColor: 'red',
                              lineWidth: 3,
                              lineOpacity: 0.9,
                           }}
                        />
                     </ShapeSource>
                  );
               })}

               {/* User */}
               <UserLocation
                  visible={true}
                  showsUserHeadingIndicator={true}
                  androidRenderMode="normal"
               />

               {/* Camera */}
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

            <View style={[styles.controls, { left: insets.left + 16, top: insets.top + 20 }]}>
               <TouchableOpacity
                  style={[styles.toggleBtn, showBuildings && styles.toggleBtnActive]}
                  onPress={() => setShowBuildings(prev => !prev)}
               >
                  <Text style={styles.toggleText}>{showBuildings ? 'Hide 3D' : 'Show 3D'}</Text>
               </TouchableOpacity>
            </View>
         </View>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   title: {
      fontSize: 22,
      margin: 12,
      fontWeight: "600",
   },
   fab: {
      position: "absolute",
      bottom: 20,
      top: 20,
      right: 20,
      backgroundColor: "#007AFF",
      borderRadius: 30,
      padding: 12,
      elevation: 4,
   },
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
      borderColor: 'rgba(255,255,255,0.25)'
   },
   toggleBtnActive: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF'
   },
   toggleText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600'
   }
});

function smoothCoordinate(prev: [number, number] | null, next: [number, number]): [number, number] {
   if (!prev) {
      return next;
   }

   const [prevLon, prevLat] = prev;
   const [nextLon, nextLat] = next;

   const lon = prevLon + SMOOTHING_ALPHA * (nextLon - prevLon);
   const lat = prevLat + SMOOTHING_ALPHA * (nextLat - prevLat);

   return [lon, lat];
}

// Reusing the distance function from loopDetection.ts (assuming it's exported)
function distance(coord1: [number, number], coord2: [number, number]): number {
   const [lon1, lat1] = coord1;
   const [lon2, lat2] = coord2;
   const R = 6371e3; // Earth radius in meters
   const φ1 = lat1 * Math.PI / 180;
   const φ2 = lat2 * Math.PI / 180;
   const Δφ = (lat2 - lat1) * Math.PI / 180;
   const Δλ = (lon2 - lon1) * Math.PI / 180;

   const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

   return R * c;
}