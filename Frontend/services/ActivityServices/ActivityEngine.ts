import * as turf from '@turf/helpers';
import distance from '@turf/distance';
import { LocationManager } from './LocationManager';
import { RouteJournal, JournalPoint } from './RouteJournal';
import { useActivityStore } from './useActivityStore';

export class ActivityEngine {
  private static instance: ActivityEngine;
  
  private locationManager: LocationManager;
  private journal: RouteJournal;
  
  // Local state for calculations
  private lastPoint: JournalPoint | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private totalDistance: number = 0; // meters
  private totalPausedTime: number = 0;
  
  private constructor() {
    this.locationManager = LocationManager.getInstance();
    this.journal = RouteJournal.getInstance();
  }

  static getInstance(): ActivityEngine {
    if (!ActivityEngine.instance) {
      ActivityEngine.instance = new ActivityEngine();
    }
    return ActivityEngine.instance;
  }

  // --- CONTROLS ---

  /**
   * Starts the activity session.
   * 1. Resets stores/journals.
   * 2. Kicks off GPS.
   * 3. Starts the UI timer.
   */
  async startActivity() {
    const store = useActivityStore.getState();
    if (store.status === 'RECORDING') return;

    // 1. Reset everything
    store.reset();
    store.setStatus('RECORDING');
    await this.journal.resetJournal();

    this.lastPoint = null;
    this.totalDistance = 0;
    this.totalPausedTime = 0;
    this.startTime = Date.now();

    // 2. Start GPS
    await this.locationManager.startTracking();

    // 3. Start Duration Timer (UI ticker)
    this.startTimer();
  }

  

  /**
   * Stops the activity and attempts upload.
   * If upload fails, it returns the file path for "Retry Later".
   */
  async stopActivity() {
    this.stopTimer();
    await this.locationManager.stopTracking();
    useActivityStore.getState().setStatus('IDLE');

    // 1. Get Data
    const fullRoute = await this.journal.saveAndFinish();
    
    const payload = {
      startTime: this.startTime,
      endTime: Date.now(),
      distanceMeters: this.totalDistance,
      durationSeconds: useActivityStore.getState().durationSeconds,
      route: fullRoute,
    };

    // 2. Attempt Upload
    try {
        // We import the service dynamically or at top of file
        const { ActivityUploadService } = require('./ActivityUploadService'); 
        await ActivityUploadService.upload(payload);
        
        // Success! Clean up the journal file since we uploaded it.
        await this.journal.resetJournal();
        return { success: true };

    } catch (error) {
        console.warn('[ActivityEngine] Upload failed, data saved locally.');
        // Return failure but with data preserved in RouteJournal
        return { success: false, error };
    }
  }

  pauseActivity() {
    useActivityStore.getState().setStatus('PAUSED');
    this.stopTimer();
    // Note: We might keep GPS running but just stop recording points, 
    // or stop GPS to save battery. For accuracy, usually better to keep GPS hot 
    // but ignore the data points.
  }

  resumeActivity() {
    useActivityStore.getState().setStatus('RECORDING');
    this.startTimer();
    // Re-adjust start time or track pause duration here if needed for precise pacing
  }

  // --- EVENT HANDLERS ---

  /**
   * Called by LocationManager (Background Task) whenever a new GPS point arrives.
   * THIS IS THE HEARTBEAT OF THE APP.
   */
  async processNewPoint(point: JournalPoint) {
    const store = useActivityStore.getState();
    
    // If we are paused, ignore the point logic (or just update map but not stats)
    if (store.status !== 'RECORDING') return;

    // 1. Calculate Distance (using Turf)
    let distDelta = 0;
    if (this.lastPoint) {
      const from = turf.point([this.lastPoint.longitude, this.lastPoint.latitude]);
      const to = turf.point([point.longitude, point.latitude]);
      
      // turf returns km, we want meters
      distDelta = distance(from, to, { units: 'kilometers' }) * 1000;
      
      // Basic Noise Filter: If user moved impossibly fast (> 30km/h running) or too little (< 1m)
      // This is a crude filter; Kalman is better, but this solves the "jitter" issue.
      if (distDelta < 0.5 || (point.speed || 0) > 40) {
        distDelta = 0; 
      }
    }

    this.totalDistance += distDelta;

    // 2. Calculate Pace (Seconds per KM)
    // Speed is m/s. 1 m/s = 1000m / 1000s. 
    // Pace = 1000 / speed.
    const currentSpeed = point.speed || 0;
    let currentPace = 0;
    if (currentSpeed > 0.5) { // Only calc pace if moving
      currentPace = 1000 / currentSpeed; 
    }

    // Average Pace = Total Duration / (Total Dist / 1000)
    const duration = store.durationSeconds;
    const avgPace = (this.totalDistance > 0) ? duration / (this.totalDistance / 1000) : 0;

    // 3. Update Journal (Disk)
    await this.journal.addPoint(point);

    // 4. Update Store (UI) - aggregated metrics
    store.updateMetrics({
      distanceMeters: this.totalDistance,
      currentSpeed: currentSpeed,
      currentPaceSeconds: currentPace,
      averagePaceSeconds: avgPace,
    });
    
    // Update map location
    store.updateLocation({
      latitude: point.latitude,
      longitude: point.longitude,
      heading: point.heading || 0,
    });

    this.lastPoint = point;
  }

  // --- INTERNAL UTILS ---

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      const store = useActivityStore.getState();
      if (store.status === 'RECORDING') {
        store.updateMetrics({
          durationSeconds: store.durationSeconds + 1
        });
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
