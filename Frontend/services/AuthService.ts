import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const TOKEN_STORAGE_KEY = "runiverse.auth.token";

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private isHydrated = false;
  private hydratePromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async persistToken(token: string | null): Promise<void> {
    this.token = token;
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
        })
        .catch((err) => {
          console.warn("Unable to hydrate auth token", err);
          this.token = null;
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
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      const response = await api.post<any>("/api/auth/login", { email, password });

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

  // 🟡 GOOGLE LOGIN
  async googleLogin(): Promise<void> {
    // On mobile, you’ll open the backend OAuth URL directly
    const url = `${api.baseURL}/api/auth/google`;
    // In a real app, use WebBrowser from Expo AuthSession:
    // import * as WebBrowser from 'expo-web-browser';
    // await WebBrowser.openBrowserAsync(url);
    console.log("Redirect to Google OAuth:", url);
  }

  // 🟠 HANDLE GOOGLE CALLBACK (optional for dev mode)
  async handleGoogleCallback(): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      const response = await api.get<any>('/api/auth/google/callback');

      if (response?.token) {
        await this.persistToken(response.token);
        return {
          success: true,
          message: 'Google login successful',
          user: response.user,
          token: response.token,
        };
      }

      return { success: false, message: 'Google login failed - no token received' };
    } catch (error: any) {
      console.error('Google callback error:', error);
      return { success: false, message: error?.message || 'Google login failed' };
    }
  }

  // 🔴 LOGOUT
  async logout() {
    await this.persistToken(null);
  }
}

export const authService = AuthService.getInstance();
