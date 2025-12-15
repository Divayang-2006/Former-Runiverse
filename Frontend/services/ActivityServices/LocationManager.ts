import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { RouteJournal, JournalPoint } from './RouteJournal';
import { ActivityEngine } from './ActivityEngine';

// --- CONFIGURATION ---
const LOCATION_TASK_NAME = 'RUNIVERSE_BACKGROUND_TRACKER';

// --- GLOBAL BACKGROUND TASK ---
// This runs even if the app is minimized.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) return;
  if (data) {
    const { locations } = data;
    // We do NOT call RouteJournal directly anymore.
    // We pipe everything through the Engine so it can calculate Stats + Save.
    const engine = ActivityEngine.getInstance(); 

    for (const loc of locations) {
      if (loc.coords.accuracy && loc.coords.accuracy > 50) continue;

      const point: JournalPoint = {
        timestamp: loc.timestamp,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
      };

      // PASS TO ENGINE
      await engine.processNewPoint(point);
    }
  }
});

// --- SERVICE CLASS ---
export class LocationManager {
  private static instance: LocationManager;
  
  // Track if we are currently recording to prevent double-starts
  private isTracking = false;

  private constructor() {}

  static getInstance(): LocationManager {
    if (!LocationManager.instance) {
      LocationManager.instance = new LocationManager();
    }
    return LocationManager.instance;
  }

  async checkPermissions(): Promise<boolean> {
    // 1. Foreground Permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return false;

    // 2. Background Permission (Crucial for "screen off" tracking)
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.warn('[LocationManager] Background permission denied. App will stop tracking when minimized.');
      // We return true anyway because we can still track in foreground, 
      // but you might want to show a warning modal to the user.
    }
    return true;
  }

  async startTracking() {
    if (this.isTracking) return;

    const hasPerms = await this.checkPermissions();
    if (!hasPerms) throw new Error('MISSING_GPS_PERMISSIONS');

    // Reset the journal for a new run
    await RouteJournal.getInstance().resetJournal();

    // Start the native service
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation, // Highest possible accuracy
      distanceInterval: 5, // Only update if user moves 5 meters (Saves battery when stopped)
      deferredUpdatesInterval: 1000, // (iOS) optimize battery by batching
      foregroundService: {
        notificationTitle: "Runiverse is Active",
        notificationBody: "Tracking your territory conquest...",
        notificationColor: "#FF5500",
      },
      showsBackgroundLocationIndicator: true, // (iOS) Blue pill in status bar
      activityType: Location.ActivityType.Fitness, // (iOS) Helps OS optimize for running
    });

    this.isTracking = true;
    console.log('[LocationManager] Tracking Started');
  }

  async stopTracking() {
    if (!this.isTracking) return;

    // Stop the native task
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    this.isTracking = false;
    console.log('[LocationManager] Tracking Stopped');
  }
}