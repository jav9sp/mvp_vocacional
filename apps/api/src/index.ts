import express from "express";
import cors from "cors";
import "dotenv/config";
import { sequelize, connectDB } from "./config/sequelize.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

import authRoutes from "./routes/auth/auth.routes.js";
import enrollmentsRoutes from "./routes/student/enrollments.router.js";
import attemptsRoutes from "./routes/student/attempts.routes.js";
import resultsRoutes from "./routes/student/results.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.WEB_URL,
    credentials: true,
  })
);
app.use(express.json());

app.get("/docs.json", (_req, res) => res.json(swaggerSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Logger ANTES de rutas
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/health/db", async (_req, res) => {
  try {
    await connectDB();
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

// TODO: Ver cómo ordenar mejor las rutas añadiendo "/student"
// Rutas
app.use("/auth", authRoutes);
app.use("/enrollments", enrollmentsRoutes);
app.use("/attempts", attemptsRoutes);
app.use("/results", resultsRoutes);
app.use("/admin", adminRoutes);

// (Opcional) 404 consistente
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

// Error handler AL FINAL
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  return res.status(500).json({ ok: false, error: "Internal server error" });
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
