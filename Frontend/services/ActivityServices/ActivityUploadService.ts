import { JournalPoint } from './RouteJournal';
import { useStore } from '@/store/useStore';
import { authService } from '@/services/AuthService';
import { api } from '@/services/api';

export interface ActivityUploadPayload {
  startTime: number;
  endTime: number;
  distanceMeters: number;
  durationSeconds: number;
  route: JournalPoint[];
  activityType?: string;
}

const MAX_STREAM_POINTS = 1500;
const MIN_STREAM_INTERVAL_MS = 1000;

type SerializedPoint = {
  lat: number;
  lng: number;
  ts: string;
  spd?: number;
  acc?: number;
};

const isValidCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const toISOStringSafe = (value: number): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
};

const roundCoordinate = (value: number, precision = 6): number => Number(value.toFixed(precision));

const normalizeRoute = (route: JournalPoint[]): SerializedPoint[] => {
  if (!Array.isArray(route) || route.length === 0) {
    return [];
  }

  const normalized: SerializedPoint[] = [];
  let lastTimestamp = -Infinity;

  for (const point of route) {
    if (!point || !isValidCoordinate(point.latitude) || !isValidCoordinate(point.longitude)) {
      continue;
    }

    const timestamp = typeof point.timestamp === 'number' ? point.timestamp : Number(point.timestamp);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    if (timestamp - lastTimestamp < MIN_STREAM_INTERVAL_MS && normalized.length > 0) {
      continue;
    }

    lastTimestamp = timestamp;
    normalized.push({
      lat: roundCoordinate(point.latitude),
      lng: roundCoordinate(point.longitude),
      ts: toISOStringSafe(timestamp),
      spd: isValidCoordinate(point.speed) ? Number(point.speed.toFixed(2)) : undefined,
      acc: isValidCoordinate(point.accuracy) ? Number(point.accuracy.toFixed(1)) : undefined,
    });
  }

  if (normalized.length > MAX_STREAM_POINTS) {
    const stride = Math.ceil(normalized.length / MAX_STREAM_POINTS);
    const downsampled: SerializedPoint[] = normalized.filter((_, index) => index % stride === 0);

    const lastPoint = normalized[normalized.length - 1];
    if (downsampled[downsampled.length - 1]?.ts !== lastPoint.ts) {
      downsampled.push(lastPoint);
    }

    return downsampled;
  }

  return normalized;
};

const resolveActivityType = (provided: string | undefined, avgSpeed: number): string => {
  if (typeof provided === 'string' && provided.trim().length > 0) {
    return provided.trim().toUpperCase();
  }

  if (avgSpeed >= 5) {
    return 'RUN';
  }

  if (avgSpeed >= 3) {
    return 'JOG';
  }

  return 'WALK';
};

export class ActivityUploadService {
  /**
   * Main entry point to upload a finished session.
   * @param payload The raw data from ActivityEngine.stopActivity()
   */
  static async upload(payload: ActivityUploadPayload) {
    await authService.hydrate();

    const state = useStore.getState();
    const user = state.user;
    const token = authService.getToken() ?? user?.token ?? null;

    if (!user || !token) {
      throw new Error('UPLOAD_FAILED_NO_AUTH');
    }

    // 1. Prepare Data
    const sanitizedDuration = Math.max(1, Math.round(payload.durationSeconds));
    const sanitizedDistance = Math.max(0, Math.round(payload.distanceMeters));
    const avgSpeed = sanitizedDistance / sanitizedDuration;

    // Estimate Calories (Simple METs calculation)
    // Running ~9.8 METs, Walking ~3.5 METs.
    const weight = typeof (user as any)?.weight === 'number' && Number.isFinite((user as any).weight)
      ? (user as any).weight
      : 70;
    const mets = avgSpeed > 2.5 ? 9.8 : 3.5;
    const hours = sanitizedDuration / 3600;
    const calories = Math.max(0, Math.round(mets * weight * hours));

    const streamPoints = normalizeRoute(payload.route);
    const stream = streamPoints.length > 1 ? { gps: { points: streamPoints } } : undefined;

    const activityType = resolveActivityType(payload.activityType, avgSpeed);

    // 2. Format Body for Backend
    // Backend expects: CreateActivityBody
    const body = {
      startTime: toISOStringSafe(payload.startTime),
      endTime: toISOStringSafe(payload.endTime),
      totalDistance: sanitizedDistance,
      calories,
      avgSpeed: Number.isFinite(avgSpeed) ? Number(avgSpeed.toFixed(2)) : 0,
      activityType,
      durationSeconds: sanitizedDuration,
      loopDetected: false,
      stream,
    };

    console.log('[UploadService] Uploading payload...', { 
      streamPoints: streamPoints.length,
      distance: body.totalDistance,
      activityType,
    });

    // 3. Network Request
    try {
      const response = await api.post<{ success?: boolean; data?: unknown; message?: string }>('/api/activities', body, token);

      if (response && typeof response === 'object') {
        const success = (response as { success?: boolean }).success;
        if (success !== false) {
          console.log('[UploadService] Success:', (response as { data?: unknown }).data ?? response);
          return response;
        }
        throw new Error((response as { message?: string }).message || 'Activity upload failed');
      }

      return response;
    } catch (error: any) {
      console.error('[UploadService] API Error:', error?.message || error);
      // We explicitly throw so the UI can catch it and "Save to Local for retry"
      throw error;
    }
  }
}
