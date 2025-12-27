import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

app.use(
  cors({
    origin: process.env.WEB_URL,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.API_PORT || 4000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
