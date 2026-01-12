import { Request, Response } from "express";
import Test from "../models/Test.model.js";

export async function adminListTests(req: Request, res: Response) {
  const tests = await Test.findAll({
    attributes: ["id", "key", "version", "name", "isActive", "createdAt"],
    order: [["createdAt", "DESC"]],
  });

  return res.json({
    ok: true,
    tests: tests.map((t) => ({
      id: t.id,
      key: t.key,
      version: t.version,
      name: t.name,
      isActive: t.isActive,
      createdAt: t.createdAt,
    })),
  });
}
