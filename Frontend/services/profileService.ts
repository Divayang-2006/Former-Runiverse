import { api } from "./api";
import { authService } from "./AuthService";
import { User } from "@/store/types";

// Mock profile service for updating user profile information.
// In a real application this would perform a network request.
export const profileService = {
   async updateUserProfile(
      partial: Partial<User>
   ): Promise<{ success: boolean; data?: Partial<User>; message?: string }> {
      try {
         const token = authService.getToken();
         if (!token) throw new Error("Not authenticated");
         const payload: any = {};
         if (partial.username) payload.username = partial.username;
         if (partial.avatarUrl) payload.avatarUrl = partial.avatarUrl;
         if (partial.city) payload.city = partial.city;
         const resp = await api.put<any>("/api/users/me", payload, token);
         const mapped: Partial<User> = {
            id: resp._id || resp.id,
            username: resp.username,
            avatarUrl: resp.avatarUrl || resp.avatar || null,
            steps: resp.steps,
            distance: resp.distance,
            territories: resp.territories,
            city: resp.city ?? null,
            lifetimeSteps: resp.lifetimeSteps,
            lifetimeDistance: resp.lifetimeDistance,
         } as any;
         return { success: true, data: mapped, message: "Profile updated" };
      } catch (e: any) {
         return { success: false, message: e.message };
      }
   },

   async updateCity(city: string) {
      return this.updateUserProfile({ city });
   },

   async fetchMe(): Promise<{ success: boolean; data?: Partial<User>; message?: string }> {
      try {
         const token = authService.getToken();
         if (!token) throw new Error("Not authenticated");
         const resp = await api.get<any>("/api/users/me", token);
         console.log("📥 /api/users/me response:", resp);
         // Map backend avatar -> avatarUrl for frontend model
         const mapped: Partial<User> = {
            id: resp._id || resp.id,
            username: resp.username,
            avatarUrl: resp.avatarUrl || resp.avatar || null,
            steps: resp.steps,
            distance: resp.distance,
            territories: resp.territories,
            email: resp.email,
            city: resp.city ?? null,
            lifetimeSteps: resp.lifetimeSteps,
            lifetimeDistance: resp.lifetimeDistance,
         } as any;
         console.log("✅ mapped profile:", mapped);
         return { success: true, data: mapped };
      } catch (e: any) {
         return { success: false, message: e.message };
      }
   },
};

export default profileService;
