import http from "http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import type { Socket } from "socket.io";
import app from "./app.js";
import User from "./models/User.js";

dotenv.config();

const HOST = process.env.HOST ?? "0.0.0.0";
const parsePort = (): number => {
  const rawPort = process.env.PORT ?? "5000";
  const parsed = Number(rawPort);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
};
const PORT = parsePort();
const SOCKET_ORIGIN = process.env.SOCKET_IO_ORIGIN ?? "*";

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: SOCKET_ORIGIN },
});

const ensureEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not defined`);
  }
  return value;
};

const fetchTopUsers = async () => {
  return User.find()
    .sort({ distance: -1 })
    .limit(10)
    .select("username avatar avatarUrl distance")
    .lean()
    .exec();
};

io.on("connection", (socket: Socket) => {
  console.log("User connected:", socket.id);

  socket.on("updateStats", async () => {
    try {
      const topUsers = await fetchTopUsers();
      io.emit("leaderboardUpdate", topUsers);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Failed to emit leaderboard update:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const connectDatabase = async (): Promise<void> => {
  const mongoUri = ensureEnv("MONGO_URI");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");
};

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("❌ Startup error:", error.message);
    process.exit(1);
  }
};

const closeServer = (): Promise<void> => {
  return new Promise((resolve) => {
    server.close((err) => {
      if (err) {
        console.error("Error closing HTTP server:", err);
      }
      resolve();
    });
  });
};

const closeSocketServer = (): Promise<void> => {
  return new Promise((resolve) => {
    io.close(() => resolve());
  });
};

const shutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  await Promise.all([closeServer(), closeSocketServer(), mongoose.connection.close()]);
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  void shutdown("unhandledRejection");
});

void startServer();
