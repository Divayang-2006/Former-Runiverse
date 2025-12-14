import axios from 'axios';
import { JournalPoint } from './RouteJournal';
import { useStore } from '@/store/useStore'; // Assuming this holds your auth token

// --- API CONFIGURATION ---
// Replace with your actual backend URL or env variable
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://YOUR_IP_ADDRESS:3000/api';

export interface ActivityUploadPayload {
  startTime: number;
  endTime: number;
  distanceMeters: number;
  durationSeconds: number;
  route: JournalPoint[];
}

export class ActivityUploadService {
  /**
   * Main entry point to upload a finished session.
   * @param payload The raw data from ActivityEngine.stopActivity()
   */
  static async upload(payload: ActivityUploadPayload) {
    const user = useStore.getState().user;
    const token = useStore.getState().token; // Or however you access your JWT

    if (!user || !token) {
      throw new Error('UPLOAD_FAILED_NO_AUTH');
    }

    // 1. Prepare Data
    const avgSpeed = payload.distanceMeters / payload.durationSeconds || 0;
    
    // Estimate Calories (Simple METs calculation)
    // Running ~8 METs, Walking ~3.5 METs. 
    // Formula: METs * Weight(kg) * Time(hours)
    // Defaulting to 70kg if user weight not found.
    const weight = user.weight || 70; 
    const mets = avgSpeed > 2.5 ? 9.8 : 3.5; // Threshold: 2.5 m/s (9km/h) = running
    const hours = payload.durationSeconds / 3600;
    const calories = Math.round(mets * weight * hours);

    // 2. Format Body for Backend
    // Backend expects: CreateActivityBody
    const body = {
      startTime: new Date(payload.startTime).toISOString(),
      endTime: new Date(payload.endTime).toISOString(),
      totalDistance: Math.round(payload.distanceMeters),
      calories: calories,
      avgSpeed: parseFloat(avgSpeed.toFixed(2)),
      activityType: avgSpeed > 2.0 ? 'RUN' : 'WALK', // Simple heuristic
      loopDetected: false, // You mentioned this is pending logic
      
      // The "Stream" object from your controller
      stream: {
        gps: {
          points: payload.route.map(p => ({
            lat: p.latitude,
            lng: p.longitude,
            ts: new Date(p.timestamp).toISOString(),
            spd: p.speed,
            acc: p.accuracy
          }))
        },
        // Future extensions:
        heartRate: null,
        steps: null,
        pace: null, 
      }
    };

    console.log('[UploadService] Uploading payload...', { 
      points: payload.route.length, 
      distance: body.totalDistance 
    });

    // 3. Network Request
    try {
      const response = await axios.post(`${API_URL}/activities`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15s timeout
      });

      if (response.status === 201 || response.status === 200) {
        console.log('[UploadService] Success:', response.data);
        return response.data;
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error: any) {
      console.error('[UploadService] API Error:', error.response?.data || error.message);
      // We explicitly throw so the UI can catch it and "Save to Local for retry"
      throw error;
    }
  }
}
