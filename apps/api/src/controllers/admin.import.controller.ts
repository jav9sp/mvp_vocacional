import { Request, Response } from "express";
import { z } from "zod";
import * as XLSX from "xlsx";
import Period from "../models/Period.model.js";
import Enrollment from "../models/Enrollment.model.js";
import User from "../models/User.model.js";
import { normalizeRut } from "../utils/rut.js";
import bcrypt from "bcrypt"; // usa el que ya estés usando; si usas bcrypt, cámbialo

const ParamsSchema = z.object({
  periodId: z.coerce.number().int().positive(),
});

function str(v: any) {
  return (v ?? "").toString().trim();
}

// Esperamos headers como: rut | nombre | curso | email (email opcional)
// toleramos variantes: RUT, Rut, Nombre, Curso, Correo, Email
function pick(row: Record<string, any>, keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (rk) => rk.trim().toLowerCase() === k.toLowerCase()
    );
    if (found) return row[found];
  }
  return "";
}

export async function adminImportEnrollmentsXlsx(req: Request, res: Response) {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid periodId" });

  const { periodId } = parsed.data;

  const period = await Period.findByPk(periodId);
  if (!period)
    return res.status(404).json({ ok: false, error: "Period not found" });

  const file = req.file as Express.Multer.File | undefined;
  if (!file)
    return res.status(400).json({ ok: false, error: "Missing file (xlsx)" });

  // Parse xlsx
  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: "",
  });

  if (!rows.length) {
    return res.status(400).json({ ok: false, error: "Empty sheet" });
  }

  let createdUsers = 0;
  let updatedUsers = 0;
  let enrolled = 0;
  let alreadyEnrolled = 0;

  const errors: Array<{ row: number; message: string }> = [];

  // Import row by row (MVP). Si luego quieres rendimiento, lo optimizamos con bulk ops.
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const rutRaw = pick(r, ["rut", "RUT"]);
    const nameRaw = pick(r, ["nombre", "name", "Nombre"]);
    const courseRaw = pick(r, ["curso", "course", "Curso"]);
    const emailRaw = pick(r, ["email", "correo", "Email", "Correo"]);

    const rut = normalizeRut(str(rutRaw));
    const name = str(nameRaw);
    const course = str(courseRaw);
    const email = str(emailRaw);

    if (!rut || rut.length < 3) {
      errors.push({ row: i + 2, message: "RUT inválido / vacío" });
      continue;
    }
    if (!name) {
      errors.push({ row: i + 2, message: "Nombre vacío" });
      continue;
    }

    // 1) Upsert user student por rut
    let user = await User.findOne({ where: { rut } });

    if (!user) {
      // password inicial = rut (hash)
      const passwordHash = await bcrypt.hash(rut, 10);

      user = await User.create({
        role: "student",
        name,
        email: email || null,
        rut,
        password: passwordHash, // ajusta si tu columna se llama passwordHash
      } as any);

      createdUsers++;
    } else {
      // update info básica si cambió (no tocamos password)
      let changed = false;
      if (user.name !== name) {
        user.name = name;
        changed = true;
      }
      if (email && user.email !== email) {
        user.email = email;
        changed = true;
      }
      if (!user.rut) {
        user.rut = rut;
        changed = true;
      }
      if (changed) {
        await user.save();
        updatedUsers++;
      }
    }

    // 2) Enrollment periodo ↔ student
    const [enr, wasCreated] = await Enrollment.findOrCreate({
      where: { periodId: period.id, studentUserId: user.id },
      defaults: {
        periodId: period.id,
        studentUserId: user.id,
        status: "active",
        meta: course ? { course } : null,
      },
    });

    if (wasCreated) {
      enrolled++;
    } else {
      alreadyEnrolled++;
      // si ya estaba pero viene course nuevo, lo guardamos
      if (course) {
        const meta = (enr.meta || {}) as any;
        if (!meta.course) {
          enr.meta = { ...meta, course };
          await enr.save();
        }
      }
    }
  }

  return res.json({
    ok: true,
    period: { id: period.id, name: period.name },
    summary: {
      rows: rows.length,
      createdUsers,
      updatedUsers,
      enrolled,
      alreadyEnrolled,
      errors: errors.length,
    },
    errors,
  });
}
