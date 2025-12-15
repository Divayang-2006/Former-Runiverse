import * as Location from "expo-location";
import profileService from "./profileService";
import { useStore } from "@/store/useStore";
import { authService } from "./AuthService";

const DEFAULT_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const FALLBACK_CITY = "Unknown";

export interface CityInfo {
  city: string | null;
  region: string | null;
  country: string | null;
}

class LocationSyncService {
  private lastSyncedCity: string | null = null;
  private lastAttemptAt = 0;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly syncIntervalMs: number = DEFAULT_SYNC_INTERVAL_MS) {}

  async ensureCitySynced(force = false): Promise<CityInfo | null> {
    const now = Date.now();
    if (!force && now - this.lastAttemptAt < this.syncIntervalMs) {
      return null;
    }

    this.lastAttemptAt = now;

    try {
      if (!authService.getToken()) {
        return null;
      }

      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      const [{ city, district, subregion, region, country } = {}] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const resolvedCity = (city || district || subregion || FALLBACK_CITY)?.trim() ?? null;
      const normalizedCity = resolvedCity && resolvedCity.length > 0 ? resolvedCity : null;

      const currentUser = useStore.getState().user;
      if (!currentUser || !normalizedCity) {
        return { city: normalizedCity, region: region ?? null, country: country ?? null };
      }

      const currentCity = currentUser.city?.trim() ?? null;
      const alreadySynced =
        currentCity && normalizedCity && currentCity.toLowerCase() === normalizedCity.toLowerCase();

      if (alreadySynced && this.lastSyncedCity === normalizedCity) {
        return { city: normalizedCity, region: region ?? null, country: country ?? null };
      }

      const result = await profileService.updateCity(normalizedCity);
      if (result.success && result.data) {
        useStore.getState().updateUser?.({ city: result.data.city ?? normalizedCity });
        this.lastSyncedCity = result.data.city ?? normalizedCity;
        return {
          city: result.data.city ?? normalizedCity,
          region: region ?? null,
          country: country ?? null,
        };
      }

      return { city: normalizedCity, region: region ?? null, country: country ?? null };
    } catch (err) {
      console.log("City sync failed:", err);
      return null;
    }
  }

  startAutoSync() {
    if (this.syncTimer) return;
    const run = () => {
      this.ensureCitySynced().catch((err) => console.log("City auto-sync error:", err));
    };

    run();
    this.syncTimer = setInterval(run, this.syncIntervalMs);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private async ensurePermissions(): Promise<boolean> {
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.status === "granted") {
        return true;
      }

      const request = await Location.requestForegroundPermissionsAsync();
      return request.status === "granted";
    } catch (err) {
      console.log("Location permission error:", err);
      return false;
    }
  }
}

export const locationService = new LocationSyncService();
