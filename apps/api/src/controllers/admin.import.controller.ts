import { Request, Response } from "express";
import { z } from "zod";
import * as XLSX from "xlsx";
import Period from "../models/Period.model.ts";
import Enrollment from "../models/Enrollment.model.ts";
import User from "../models/User.model.ts";
import { normalizeRut } from "../utils/rut.js";
import bcrypt from "bcrypt"; // usa el que ya estés usando; si usas bcrypt, cámbialo

const ParamsSchema = z.object({
  periodId: z.coerce.number().int().positive(),
});

const RowSchema = z.object({
  rut: z.string().min(3, "RUT inválido / vacío"),
  nombre: z.string().min(1, "Nombre vacío"),
  email: z.email("Email inválido"),
  curso: z.string().optional().or(z.literal("")),
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

function normalizeHeaderKey(k: string) {
  return (k || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sin tildes
    .replace(/\s+/g, "");
}

// mapea sinónimos → canonical
const HEADER_MAP: Record<string, "rut" | "nombre" | "email" | "curso"> = {
  rut: "rut",
  run: "rut",
  "rut/dv": "rut",
  nombre: "nombre",
  name: "nombre",
  alumno: "nombre",
  estudiante: "nombre",
  email: "email",
  correo: "email",
  mail: "email",
  curso: "curso",
  course: "curso",
  cursoactual: "curso",
};

function canonicalizeRowKeys(row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const nk = normalizeHeaderKey(k);
    const canonical = HEADER_MAP[nk];
    if (canonical) out[canonical] = v;
  }
  return out;
}

function getPresentCanonicalHeaders(rows: Record<string, any>[]) {
  const set = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      const canonical = HEADER_MAP[normalizeHeaderKey(k)];
      if (canonical) set.add(canonical);
    }
  }
  return set;
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

  const present = getPresentCanonicalHeaders(rows);

  const required = ["rut", "nombre", "email"] as const;
  const missing = required.filter((k) => !present.has(k));

  if (missing.length) {
    return res.status(422).json({
      ok: false,
      error: "Plantilla inválida",
      details: {
        missingColumns: missing,
        expected: ["rut", "nombre", "email", "curso (opcional)"],
      },
    });
  }

  let createdUsers = 0;
  let updatedUsers = 0;
  let enrolled = 0;
  let alreadyEnrolled = 0;

  const errors: Array<{ row: number; message: string; field?: string }> = [];
  const MAX_ERRORS = 200; // evita respuestas gigantes

  // Import row by row (MVP). Si luego quieres rendimiento, lo optimizamos con bulk ops.
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];

    const canon = canonicalizeRowKeys(raw);
    const parsedRow = RowSchema.safeParse({
      rut: normalizeRut(String(canon.rut ?? "")),
      nombre: String(canon.nombre ?? "").trim(),
      email: String(canon.email ?? "").trim(),
      curso: String(canon.curso ?? "").trim(),
    });

    if (!parsedRow.success) {
      for (const issue of parsedRow.error.issues) {
        errors.push({
          row: i + 2,
          field: String(issue.path?.[0] ?? ""),
          message: issue.message,
        });
        if (errors.length >= MAX_ERRORS) break;
      }
      if (errors.length >= MAX_ERRORS) break;
      continue;
    }

    const { rut, nombre: name, email, curso: course } = parsedRow.data;

    // 1) Upsert user student por rut
    let user = await User.findOne({ where: { rut } });

    if (!user) {
      // password inicial = rut (hash)
      const passwordHash = await bcrypt.hash(rut, 10);

      user = await User.create({
        role: "student",
        name,
        organizationId: req.auth.organizationId,
        email: email || null,
        rut,
        passwordHash,
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
