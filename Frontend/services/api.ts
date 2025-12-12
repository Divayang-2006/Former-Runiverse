// src/services/api.ts

const normalize = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const resolveBaseUrl = (): string => {
  const devUrl = normalize(process.env.EXPO_PUBLIC_API_URL_DEV);
  const prodUrl = normalize(process.env.EXPO_PUBLIC_API_URL_PROD);

  if (!devUrl || !prodUrl) {
    throw new Error("EXPO_PUBLIC_API_URL_DEV and EXPO_PUBLIC_API_URL_PROD must be defined in .env");
  }

  const expoDevFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  const isDev = typeof expoDevFlag === "boolean" ? expoDevFlag : (process.env.NODE_ENV ?? "development") !== "production";

  return isDev ? devUrl : prodUrl;
};

const BASE_URL = resolveBaseUrl();

async function handleResponse<T>(res: Response, path: string): Promise<T> {
  let data: any = null;
  try {
    // Some DELETE endpoints return no JSON
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    console.warn(` Failed to parse response from ${path}`);
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
