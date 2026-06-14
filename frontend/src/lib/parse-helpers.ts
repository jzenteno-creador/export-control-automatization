/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Parse helpers --------------------------------------------------------

export function stripZeros(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/^0+/, "");
  return s.length === 0 ? "0" : s;
}

export function getPO(p: any): string | null {
  const list = p?.ReferenceIdentificationGeneral || [];
  for (const r of list) {
    if (r?.ReferenceIdentificationQualifier === "PO") {
      return r.ReferenceIdentification ?? null;
    }
  }
  return null;
}

export function gmidOfItem(it: any): string | null {
  const dmn = (it?.DescriptionMarksAndNumbers || [])[0] || {};
  const cc = dmn.CommodityCode;
  if (cc === null || cc === undefined || cc === "") return null;
  const n = parseInt(String(cc), 10);
  if (Number.isNaN(n)) return String(cc);
  return n.toString();
}

export function ladingOfItem(it: any): string | null {
  const dmn = (it?.DescriptionMarksAndNumbers || [])[0] || {};
  return dmn.LadingDescription || null;
}

export function deliveryOfItem(it: any): string | null {
  const ii = (it?.ItemIdentification || [])[0] || {};
  return ii.ProductServiceIDQualifierVo || null;
}

export function getInstructions(p: any): string | null {
  return p?.BusinessInstructionsReferenceNumberNotes || null;
}

export function getOrderType(po: string | null): string {
  if (!po) return "Unknown";
  const s = String(po).replace(/^0+/, "");
  if (!s) return "Unknown";
  return s[0] === "4" ? "STO" : s[0] === "1" ? "Trade" : "Other";
}

export function getShipment(p: any): string | null {
  return p?.ShipmnetIdentificationNumber ?? null;
}

// ISC → MOT mapping
export const ISC_TO_MOT: Record<string, string> = {
  "01": "M", "02": "M", "03": "M", "12": "M",
  "05": "O", "06": "O", "11": "O", "18": "O",
  "07": "A",
};

export const ISC_LABEL: Record<string, string> = {
  "01": "TL Full Truckload",
  "02": "LTL Partial TL",
  "03": "Tank Truck",
  "05": "FCL Full Container",
  "06": "LCL Part Container",
  "07": "Air Cargo",
  "11": "Deep Sea Vessel",
  "12": "ISO Tank Road",
  "18": "ISO Tank Sea",
};

export function getIscOfPayload(p: any): string | null {
  return p?.Items?.[0]?.ContainerDetails?.[0]?.IntermodalServiceCode || null;
}

export function fmtIsc(isc: string | null): string | null {
  if (!isc) return null;
  const desc = ISC_LABEL[isc];
  return desc ? `${isc} — ${desc}` : isc;
}

export function getAllIscOfPayload(p: any): string[] {
  const items = p?.Items || [];
  const out: string[] = [];
  for (const it of items) {
    const cd = it?.ContainerDetails || [];
    for (const c of cd) {
      const isc = c?.IntermodalServiceCode;
      if (isc) out.push(isc);
    }
  }
  return out;
}

export interface MotInfo {
  code: string;
  label: string;
  inferred: boolean;
  source: string;
  iscUsed?: string;
}

export function getMotInfo(p: any): MotInfo {
  const route = (p?.RouteInformation || [])[0] || {};
  const code = route.TransportationMethodTypeCode;
  const firstItem = (p?.Items || [])[0];
  const firstCd = firstItem?.ContainerDetails?.[0];
  const isc = firstCd?.IntermodalServiceCode;

  if (isc && ISC_TO_MOT[isc]) {
    const mot = ISC_TO_MOT[isc];
    const label = mot === "O" ? "Marítimo" : mot === "M" ? "Terrestre" : "Aéreo";
    return { code: mot, label, inferred: false, source: "ISC", iscUsed: isc };
  }

  if (code === "O") return { code: "O", label: "Marítimo", inferred: false, source: "MOT_code" };
  if (code === "M") return { code: "M", label: "Terrestre", inferred: false, source: "MOT_code" };
  if (code === "A") return { code: "A", label: "Aéreo", inferred: false, source: "MOT_code" };
  if (code === "R") return { code: "R", label: "Ferroviario", inferred: false, source: "MOT_code" };

  const desc = (route.RouteDescription || "").toUpperCase();
  if (desc.includes("TM-") || desc.includes("TT") || desc.includes("DSV") || desc.includes("SEA")) {
    return { code: "O", label: "Marítimo", inferred: true, source: "RouteDescription" };
  }
  if (desc.includes("FTL") || desc.includes("CUST") || desc.includes("PCKUP") || desc.includes("AR-")) {
    return { code: "M", label: "Terrestre", inferred: true, source: "RouteDescription" };
  }
  return { code: code || "?", label: code || "?", inferred: false, source: "none" };
}

export function getMOT(p: any): string { return getMotInfo(p).code; }

export function motLabel(c: string): string {
  if (c === "M") return "Terrestre";
  if (c === "O") return "Marítimo";
  if (c === "A") return "Aéreo";
  if (c === "R") return "Ferroviario";
  if (!c || c === "?") return "—";
  return c;
}

export function getDestCountry(p: any): string | null {
  const ents = p?.Entities || [];
  for (const e of ents) if (e?.EntityIdentifier === "ST") return e?.CountryCode || null;
  for (const e of ents) if (e?.EntityIdentifier === "N1") return e?.CountryCode || null;
  return null;
}

export function getDestFallback(p: any): string {
  return p?.DeliveryLocation || p?.PlaceOfDelivery || "—";
}

export function getItemsCount(p: any): number {
  return Array.isArray(p?.Items) ? p.Items.length : 0;
}

export function getContainerCount(p: any): number {
  return getItemsCount(p);
}

export function getDeliveries(p: any): string[] {
  const items = p?.Items || [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const ii = (Array.isArray(it?.ItemIdentification) ? it.ItemIdentification[0] : it?.ItemIdentification) || {};
    const raw = ii?.ProductServiceIDQualifierVo;
    if (raw === undefined || raw === null) continue;
    const s = String(raw).replace(/^0+/, "") || "0";
    if (!seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}

export function getSoldToName(p: any): string | null {
  const ents = p?.Entities || [];
  for (const e of ents) if (e?.EntityIdentifier === "CN") return e?.Name || null;
  for (const e of ents) if (e?.EntityIdentifier === "BT") return e?.Name || null;
  return null;
}

export function getShipToName(p: any): string | null {
  const ents = p?.Entities || [];
  for (const e of ents) if (e?.EntityIdentifier === "ST") return e?.Name || null;
  return null;
}

export function getConsigneeName(p: any): string | null {
  const ents = p?.Entities || [];
  for (const e of ents) if (e?.EntityIdentifier === "CN") return e?.Name || null;
  for (const e of ents) if (e?.EntityIdentifier === "N1") return e?.Name || null;
  return null;
}

export function getDate002(p: any): string | null {
  const dtr = p?.DateTimeReference || [];
  for (const d of dtr) if (d?.DateTimeQualifier === "002") return d.Date;
  return null;
}

export function getRoutingNumber(p: any): string | null { return p?.RoutingNumber ?? null; }
export function getCurrency(p: any): string | null { return p?.CurrencyCode || null; }
export function getIncoterm(p: any): string | null { return p?.TransportationTermsCode || null; }
export function getDeliveryLocation(p: any): string | null { return p?.DeliveryLocation || null; }
export function getTariffServiceCode(p: any): string | null { return p?.TariffServiceCode || null; }
export function getTermsOfSaleDescription(p: any): string | null { return p?.TermsOfSaleDescription || null; }

export function getRSD(p: any): string | null {
  const dtr = p?.DateTimeReference || [];
  for (const d of dtr) if (d?.DateTimeQualifier === "RSD") return d.Date;
  return null;
}

export function fmtSAPDate(n: string | null): string {
  if (!n) return "—";
  const s = String(n);
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

export function fmtTs(t: string): string {
  try { return new Date(t).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }); }
  catch { return t; }
}

export function entityLabel(eid: string): string {
  const map: Record<string, string> = {
    EX: "Exporter", ST: "Ship-To", CN: "Consignee", BT: "Bill-To",
    N1: "Notify Party", NP: "Notify Party (secundario)", DIR: "Distribution Recipient",
    PK: "Doc. Recipient (original)", PK2: "Doc. Recipient (copia 2)", PK3: "Doc. Recipient (copia 3)",
    "16": "Plant / Punto de despacho", AO: "Puerto de destino",
  };
  return map[eid] || eid || "?";
}

export function getEntName(p: any, eid: string): string | null {
  const ents = p?.Entities || [];
  for (const e of ents) if (e?.EntityIdentifier === eid) return e?.Name || null;
  return null;
}
