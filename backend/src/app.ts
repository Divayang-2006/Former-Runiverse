import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import territoryRoutes from "./routes/territoryRoutes.js";
import friendsRoutes from "./routes/friendsRoutes.js";
import clubRoutes from "./routes/clubRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import { env } from "./config/env.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
const allowedOrigins = env.frontendOrigins();
app.use(
	cors({
		origin: allowedOrigins.length > 0 ? allowedOrigins : true,
		credentials: true,
	}),
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/territory", territoryRoutes);
app.use("/api", friendsRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/summaries", summaryRoutes);

app.get("/", (_req: Request, res: Response) => res.json({ message: "Runiverse Backend running 🚀" }));

app.use(notFound);
app.use(errorHandler);

export default app;
