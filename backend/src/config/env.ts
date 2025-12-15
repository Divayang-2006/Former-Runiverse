import dotenv from "dotenv";

dotenv.config();

const cachedEnv = new Map<string, string>();

const resolveEnv = (key: string): string | undefined => {
  if (cachedEnv.has(key)) {
    return cachedEnv.get(key);
  }
  const value = process.env[key];
  if (value !== undefined) {
    cachedEnv.set(key, value);
  }
  return value;
};

export const getEnvVar = (key: string, fallback?: string): string => {
  const value = resolveEnv(key);
  if (value !== undefined) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Environment variable ${key} is not set`);
};

export const env = {
  jwtSecret: (): string => getEnvVar("JWT_SECRET"),
  jwtExpiration: (): string => getEnvVar("JWT_EXPIRATION", "7d"),
  cloudinaryCloudName: (): string => getEnvVar("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: (): string => getEnvVar("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: (): string => getEnvVar("CLOUDINARY_API_SECRET"),
  cloudinaryAvatarFolder: (): string => getEnvVar("CLOUDINARY_AVATAR_FOLDER", "runiverse/avatars"),
  frontendOrigins: (): string[] => {
    const rawOrigins = resolveEnv("FRONTEND_ORIGINS");
    if (!rawOrigins) {
      return [];
    }
    return rawOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  },
};
