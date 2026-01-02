import express from "express";
import cors from "cors";
import "dotenv/config";
import { sequelize, connectDB } from "./config/sequelize.ts";

import authRoutes from "./auth/auth.routes.ts";
import meRoutes from "./auth/me.routes.ts";
import testRoutes from "./routes/test.routes.ts";
import attemptsRoutes from "./routes/attempts.routes.ts";
import resultsRoutes from "./routes/results.routes.ts";
import adminRoutes from "./routes/admin.routes.ts";

const app = express();

app.use(
  cors({
    origin: process.env.WEB_URL,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/health/db", async (_req, res) => {
  try {
    await connectDB();
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

async function bootstrap() {
  await connectDB();

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    await sequelize.sync();
  }

  const port = Number(process.env.API_PORT || 4000);
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/auth", authRoutes);
app.use("/", meRoutes);
app.use("/test", testRoutes);
app.use("/attempts", attemptsRoutes);
app.use("/", resultsRoutes);
app.use("/admin", adminRoutes);
