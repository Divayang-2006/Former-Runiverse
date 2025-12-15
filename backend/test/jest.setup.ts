import { afterAll, afterEach, beforeAll } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";
process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? "1h";
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "test-cloud";
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY ?? "test-key";
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "test-secret";
process.env.CLOUDINARY_AVATAR_FOLDER = process.env.CLOUDINARY_AVATAR_FOLDER ?? "test/avatars";
process.env.FRONTEND_ORIGINS = process.env.FRONTEND_ORIGINS ?? "http://localhost";
process.env.SOCKET_IO_ORIGIN = process.env.SOCKET_IO_ORIGIN ?? "http://localhost";

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  process.env.MONGO_URI = mongoUri;

  await mongoose.connect(mongoUri, {
    dbName: "runiverse-test",
  });
});

afterEach(async () => {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  const collections = await db.collections();

  await Promise.all(
    collections.map(async (collection) => {
      await collection.deleteMany({});
    })
  );
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
