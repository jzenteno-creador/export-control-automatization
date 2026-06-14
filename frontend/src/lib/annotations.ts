/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Annotation {
  warn?: boolean;
  text: string;
}

export const JSON_ANNOTATIONS: Record<string, Annotation> = {
  ShipmnetIdentificationNumber: { warn: true, text: "typo SAP — ID del shipment" },
  TariffServiceCode: { warn: false, text: "DD=Trade / DP=STO" },
  TransportationTermsCode: { warn: false, text: "Incoterm" },
  DeliveryLocation: { warn: false, text: "Lugar del Incoterm (no destino final)" },
  BusinessInstructionsReferenceNumberNotes: { warn: true, text: "CAMPO CRÍTICO — instrucciones al forwarder (BL, NCM, docs, regulatorio)" },
  "RouteInformation[].StandardCarrierAlphaCode": { warn: false, text: "Carrier asignado por SAP" },
  "RouteInformation[].TransportationMethodTypeCode": { warn: true, text: "no confiable como fuente primaria. Usar IntermodalServiceCode (ISC)" },
  "RouteInformation[].FreeFormDescription": { warn: false, text: "Código de ruta SAP" },
  "RouteInformation[].RouteDescription": { warn: false, text: "Descripción codificada de la ruta SAP" },
  "Items[].ContainerDetails[].IntermodalServiceCode": { warn: false, text: "Shipping Type SAP (fuente primaria MOT)" },
  "Items[].ContainerDetails[].EquipmentType": { warn: false, text: "Tipo contenedor (40CZ=40′ marítimo, VAEM=terrestre)" },
  "Items[].ContainerDetails[].NumberOfContainers": { warn: true, text: "NO usar para contar — usar Items.length" },
  "Items[].DescriptionMarksAndNumbers[].CommodityCode": { warn: false, text: "GMID Dow — display sin leading zeros" },
  "Items[].DescriptionMarksAndNumbers[].LadingDescription": { warn: false, text: "Descripción comercial del producto" },
  "Items[].ItemIdentification[].ProductServiceIDQualifierVo": { warn: false, text: "Delivery number SAP" },
  "Items[].PricingInformationUnitPrice": { warn: false, text: "Precio unitario USD" },
  "Items[].PricingInformationMonetaryAmount": { warn: false, text: "Monto total del ítem USD" },
};

interface ArrayElementConfig {
  field: string;
  map: Record<string, string>;
}

export const ARRAY_ELEMENT_ANNOTATIONS: Record<string, ArrayElementConfig> = {
  "ReferenceIdentificationGeneral[]": {
    field: "ReferenceIdentificationQualifier",
    map: {
      PO: "Purchase Order (ID principal)",
      SF: "Ship From (planta origen)",
      PE: "Transportation Planning Point",
      CO: "Contract Number (solo Trade)",
    },
  },
  "DateTimeReference[]": {
    field: "DateTimeQualifier",
    map: {
      RSD: "Requested Ship Date",
      "002": "Delivery Requested (ETA contractual)",
    },
  },
  "Entities[]": {
    field: "EntityIdentifier",
    map: {
      EX: "Exportador (siempre PBB Polisur A136)",
      ST: "Ship-To (destinatario físico)",
      BT: "Bill-To / Sold-To comercial",
      CN: "Consignee BL / Importer of Record cuando BT es forwarder",
      N1: "Notify Party (fallback universal para mailing)",
      NP: "Notify secundario",
      "16": "Plant / Punto de despacho",
      AO: "Punto de entrega según Incoterm",
      DIR: "Distribution Recipient (NO 'Director')",
      PK: "Doc Recipient copia 1",
      PK2: "Doc Recipient copia 2",
      PK3: "Doc Recipient copia 3",
    },
  },
  "Items[].BusinessInstructionsAndReferenceNumber[]": {
    field: "ReferenceIdentification",
    map: {
      PGIDATE: "Fecha despacho planificada",
      DELIVERY: "Delivery SAP (duplica Vo)",
      PAYMTRMS: "Términos de pago",
      "OCEAN CSGN": "Texto consignee oceánico",
    },
  },
};

export function lookupKeyAnnotation(canonicalPath: string): Annotation | null {
  return JSON_ANNOTATIONS[canonicalPath] || null;
}

export function lookupArrayElementAnnotation(canonicalArrayPath: string, elem: any): { qualifier: string; text: string } | null {
  const cfg = ARRAY_ELEMENT_ANNOTATIONS[canonicalArrayPath];
  if (!cfg || elem == null || typeof elem !== "object") return null;
  const v = elem[cfg.field];
  if (!v) return null;
  const text = cfg.map[v];
  if (!text) return null;
  return { qualifier: v, text };
}
