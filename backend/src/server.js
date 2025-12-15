import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import User from "./models/User.js";
import passport from "passport";
import "./config/passport.js";
import "./models/Badge.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("updateStats", async () => {
    const topUsers = await User.find().sort({ distance: -1 }).limit(10).select("username avatar distance");
    io.emit("leaderboardUpdate", topUsers);
  });

  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas");
    server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running at http://0.0.0.0:${PORT}`));
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

startServer();
