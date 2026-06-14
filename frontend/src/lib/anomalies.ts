/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAllIscOfPayload, getEntName, getMotInfo } from "./parse-helpers";

export const ANOMALY_TYPES = [
  {
    key: "ior_activo",
    label: "IOR activo (BT es depósito/cliente, CN es el destinatario real)",
    severity: "info" as const,
    description: "En estas órdenes el Sold-to (BT) es un depósito fiscal o cliente intermediario. El Importer of Record real está en CN y es quien aparece como Sold-to en el dashboard.",
  },
  {
    key: "entidades_faltantes",
    label: "Entidades críticas faltantes",
    severity: "high" as const,
    description: "BT y ST son obligatorios. N1 (Notify Party) solo cuenta como faltante en órdenes marítimas.",
  },
  {
    key: "isc_mixto",
    label: "Items con IntermodalServiceCode mixto",
    severity: "warn" as const,
    description: "Una misma orden tiene items con IntermodalServiceCode distintos. Puede afectar el MOT inferido (se usa el del primer item).",
  },
];

export function detectAnomalies(row: any): { types: string[]; missing: string[] } {
  const p = row.payload || {};
  const out: string[] = [];
  const allIsc = getAllIscOfPayload(p);
  const distinctIsc = Array.from(new Set(allIsc));
  const btName = getEntName(p, "BT");
  const stName = getEntName(p, "ST");
  const cnName = getEntName(p, "CN");
  const n1Name = getEntName(p, "N1");
  const motInfo = getMotInfo(p);
  const isMaritime = motInfo.code === "O";

  if (cnName && btName && cnName !== btName) {
    out.push("ior_activo");
  }

  const missing: string[] = [];
  if (!btName) missing.push("BT");
  if (!stName) missing.push("ST");
  if (!n1Name && isMaritime) missing.push("N1");
  if (missing.length) out.push("entidades_faltantes");

  if (distinctIsc.length > 1) out.push("isc_mixto");

  return { types: out, missing };
}
