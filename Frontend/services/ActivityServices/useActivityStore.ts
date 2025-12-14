import { create } from 'zustand';

export type ActivityStatus = 'IDLE' | 'RECORDING' | 'PAUSED';

interface ActivityState {
  // --- STATE ---
  status: ActivityStatus;
  
  // Live Metrics (Displayed on UI)
  durationSeconds: number;
  distanceMeters: number;
  currentPaceSeconds: number; // Seconds per km
  averagePaceSeconds: number; // Seconds per km
  currentSpeed: number; // m/s
  
  // Current Location (For Map Centering)
  currentLocation: {
    latitude: number;
    longitude: number;
    heading: number;
  } | null;

  // --- ACTIONS ---
  setStatus: (status: ActivityStatus) => void;
  updateMetrics: (metrics: Partial<{ 
    durationSeconds: number; 
    distanceMeters: number; 
    currentPaceSeconds: number; 
    averagePaceSeconds: number; 
    currentSpeed: number 
  }>) => void;
  updateLocation: (location: { latitude: number; longitude: number; heading: number }) => void;
  reset: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  status: 'IDLE',
  
  durationSeconds: 0,
  distanceMeters: 0,
  currentPaceSeconds: 0,
  averagePaceSeconds: 0,
  currentSpeed: 0,
  
  currentLocation: null,

  setStatus: (status) => set({ status }),
  
  updateMetrics: (metrics) => set((state) => ({ ...state, ...metrics })),
  
  updateLocation: (location) => set({ currentLocation: location }),
  
  reset: () => set({
    status: 'IDLE',
    durationSeconds: 0,
    distanceMeters: 0,
    currentPaceSeconds: 0,
    averagePaceSeconds: 0,
    currentSpeed: 0,
    currentLocation: null,
  }),
}));