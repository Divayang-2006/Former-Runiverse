import { api } from "./api";
import { authService } from "./AuthService";
import { useStore } from "@/store/useStore";
import { estimateCaloriesFromSteps } from "@/utils/fitness";

interface SyncStatsPayload {
  steps?: number;
  distance?: number;
  calories?: number;
}

interface SyncStatsResponse {
  msg: string;
  user: {
    id: string;
    steps: number;
    distance: number;
    calories?: number;
    lifetimeSteps?: number;
    lifetimeDistance?: number;
    totalCalories?: number;
    territories?: number;
  };
}

export const statsService = {
  async syncStats(payload: SyncStatsPayload): Promise<SyncStatsResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const body: SyncStatsPayload = {};
    const stepsProvided = typeof payload.steps === "number" && payload.steps > 0;
    const distanceProvided = typeof payload.distance === "number" && payload.distance > 0;
    const caloriesProvided = typeof payload.calories === "number" && payload.calories > 0;

    if (stepsProvided) {
      body.steps = Math.round(payload.steps!);
    }

    if (distanceProvided) {
      body.distance = Math.round(payload.distance! * 100) / 100;
    }

    if (!caloriesProvided && stepsProvided) {
      body.calories = Math.round(estimateCaloriesFromSteps(payload.steps!));
    } else if (caloriesProvided) {
      body.calories = Math.round(payload.calories!);
    }

    if (!body.steps && !body.distance && !body.calories) {
      return {
        msg: "Nothing to sync",
        user: {
          id: "",
          steps: 0,
          distance: 0,
          calories: 0,
        },
      };
    }

    const response = await api.put<SyncStatsResponse>("/api/users/me/sync-stats", body, token);

    const updateUser = useStore.getState().updateUser;
    if (typeof updateUser === "function") {
      updateUser({
        steps: response.user.steps,
        distance: response.user.distance,
        calories: response.user.calories,
        lifetimeSteps: response.user.lifetimeSteps,
        lifetimeDistance: response.user.lifetimeDistance,
        totalCalories: response.user.totalCalories,
      } as any);
    }

    return response;
  },
};

export default statsService;
