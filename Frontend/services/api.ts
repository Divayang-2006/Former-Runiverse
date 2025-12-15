// src/services/api.ts
import Constants from "expo-constants";

const normalize = (value: string) => (value.endsWith("/") ? value.slice(0, -1) : value);

const resolveBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const configUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (envUrl) return normalize(envUrl);
  if (configUrl) return normalize(configUrl);
  return "https://runiverse.vercel.app";
};

// You can swap this line to use `resolveBaseUrl()` later
const BASE_URL = "http://10.131.36.100:5000";

async function handleResponse<T>(res: Response, path: string): Promise<T> {
  let data: any = null;
  try {
    // Some DELETE endpoints return no JSON
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    console.warn(`⚠️ Failed to parse response from ${path}`);
  }

  if (!res.ok) {
    const message = data?.message || res.statusText || "Unknown error";
    throw new Error(`${res.status} ${path} → ${message}`);
  }

  return data as T;
}

export const api = {
  baseURL: BASE_URL,

  async get<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return handleResponse<T>(res, path);
  },

  async post<T>(path: string, body: any, token?: string): Promise<T> {
    const isFormData = body instanceof FormData;

    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: isFormData ? body : JSON.stringify(body),
    });

    return handleResponse<T>(res, path);
  },

  async put<T>(path: string, body: any, token?: string): Promise<T> {
    const isFormData = body instanceof FormData;

    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: isFormData ? body : JSON.stringify(body),
    });

    return handleResponse<T>(res, path);
  },

  async delete<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    return handleResponse<T>(res, path);
  },
  async postForm<T>(path: string, body: FormData, token?: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`POST form ${path} failed: ${errText}`);
    }

    return res.json();
  },
};
