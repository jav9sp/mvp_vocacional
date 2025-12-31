import { INAPV_AREAS } from "../../../../packages/shared/src/inapv/inapv.data.js";

const AREA_NAME_BY_KEY = new Map(INAPV_AREAS.map((a) => [a.key, a.name]));

export function areaName(areaKey: string) {
  return AREA_NAME_BY_KEY.get(areaKey) || areaKey;
}
