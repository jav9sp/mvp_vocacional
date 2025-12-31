export const INAPV_AREA_NAME: Record<string, string> = {
  adm: "Administración de Empresas y Derecho",
  agr: "Agricultura, Silvicultura, Pesca y Veterinaria",
  art: "Artes y Humanidades",
  csn: "Ciencias Naturales, Matemática y Estadística",
  soc: "Ciencias Sociales, Periodismo e Información",
  edu: "Educación",
  ing: "Ingeniería, Industria y Construcción",
  sal: "Salud y Bienestar",
  seg: "Servicios de Seguridad y Personales",
  tec: "Tecnologías de la Información y Comunicación",
};

export function areaName(key: string) {
  return INAPV_AREA_NAME[key] || key;
}
