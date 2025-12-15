import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { api } from "./api";

const TOKEN_STORAGE_KEY = "runiverse.auth.token";

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private isHydrated = false;
  private hydratePromise: Promise<void> | null = null;

  private constructor() {}

  private applyAuthHeader(token: string | null): void {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async persistToken(token: string | null): Promise<void> {
    this.token = token;
    this.applyAuthHeader(token);
    try {
      if (token) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (err) {
      console.warn("Failed to persist auth token", err);
    }
  }

  async hydrate(): Promise<void> {
    if (this.isHydrated) return;
    if (!this.hydratePromise) {
      this.hydratePromise = AsyncStorage.getItem(TOKEN_STORAGE_KEY)
        .then((stored) => {
          this.token = stored;
          this.applyAuthHeader(this.token);
        })
        .catch((err) => {
          console.warn("Unable to hydrate auth token", err);
          this.token = null;
          this.applyAuthHeader(null);
        })
        .finally(() => {
          this.isHydrated = true;
        });
    }
    await this.hydratePromise;
  }

  getToken(): string | null {
    return this.token;
  }

  // 🟢 LOGIN
  async login(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      const response = await api.post<any>("/api/auth/login", { identifier, password });

      if (response?.token) {
        await this.persistToken(response.token);
        return {
          success: true,
          message: "Login successful",
          user: response.user,
          token: response.token,
        };
      }

      return { success: false, message: response?.message || "Invalid credentials" };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, message: error?.message || "Login failed" };
    }
  }

  // 🟣 REGISTER
  async register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      const response = await api.post<any>("/api/auth/register", userData);

      if (response?.token) {
        await this.persistToken(response.token);
        return {
          success: true,
          message: "Registration successful",
          user: response.user,
          token: response.token,
        };
      }

      return { success: false, message: response?.message || "Registration failed" };
    } catch (error: any) {
      console.error("Registration error:", error);
      return { success: false, message: error?.message || "Registration failed" };
    }
  }

  // 🔴 LOGOUT
  async logout() {
    const token = this.getToken();

    try {
      if (token) {
        await api.post<any>("/api/auth/logout", {}, token);
      }
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      await this.persistToken(null);
      this.isHydrated = true;
    }
  }
}

export const authService = AuthService.getInstance();
