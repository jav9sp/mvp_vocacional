export function normalizeRut(input: string) {
  const raw = (input || "").toString().trim().toUpperCase();
  const cleaned = raw.replace(/\./g, "").replace(/\s+/g, "");
  // asegurar guión antes del DV
  if (!cleaned.includes("-") && cleaned.length >= 2) {
    return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
  }
  return cleaned;
}
