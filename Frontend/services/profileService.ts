import { api } from "./api";
import { authService } from "./AuthService";
import { User } from "@/store/types";

const mapBackendUser = (payload: any): Partial<User> => {
   if (!payload) {
      return {};
   }

   return {
      id: payload.id || payload._id,
      username: payload.username,
      email: payload.email,
      avatarUrl: payload.avatar ?? payload.avatarUrl ?? null,
      displayName: payload.displayName ?? null,
      bio: payload.bio ?? null,
      mobileNumber: payload.mobileNumber ?? null,
      steps: payload.steps,
      distance: payload.distance,
      territories: payload.territories,
      lifetimeSteps: payload.lifetimeSteps,
      lifetimeDistance: payload.lifetimeDistance,
      streak: payload.streak,
      multiplier: payload.multiplier,
      city: payload.city ?? null,
   } as Partial<User>;
};

const extractData = (response: any) => (response && typeof response === "object" && "data" in response ? response.data : response);

export const profileService = {
   async updateUserProfile(
      partial: Partial<User>
   ): Promise<{ success: boolean; data?: Partial<User>; message?: string }> {
      try {
         const token = authService.getToken();
         if (!token) throw new Error("Not authenticated");

         const payload: Record<string, unknown> = {};
         const localOnlyUpdates: Partial<User> = {};

         if (Object.prototype.hasOwnProperty.call(partial, "displayName")) {
            payload.displayName = partial.displayName ?? null;
         }

         if (Object.prototype.hasOwnProperty.call(partial, "avatarUrl")) {
            payload.avatar = partial.avatarUrl ?? null;
         }

         if (Object.prototype.hasOwnProperty.call(partial, "bio")) {
            payload.bio = partial.bio ?? null;
         }

         if (Object.prototype.hasOwnProperty.call(partial, "mobileNumber")) {
            payload.mobileNumber = partial.mobileNumber ?? null;
         }

         if (Object.prototype.hasOwnProperty.call(partial, "city")) {
            localOnlyUpdates.city = partial.city ?? null;
         }

         if (Object.keys(payload).length === 0) {
            if (Object.keys(localOnlyUpdates).length > 0) {
               return { success: true, data: localOnlyUpdates, message: "Profile updated" };
            }
            return { success: false, message: "No profile fields provided" };
         }

         const resp = await api.put<any>("/api/users/me", payload, token);
         const mapped = {
            ...mapBackendUser(extractData(resp)),
            ...localOnlyUpdates,
         };

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
         const mapped = mapBackendUser(extractData(resp));

         return { success: true, data: mapped };
      } catch (e: any) {
         return { success: false, message: e.message };
      }
   },
};

export default profileService;
