import express from "express";
import cors from "cors";

const server = express();
server.use(express.json());
server.use(
  cors({
    origin: process.env.WEB_URL,
    credentials: true,
  })
);

export default server;
