"use client";

import { useState } from "react";
import { Pill } from "./ui";
import {
  stripZeros, getPO, getOrderType, getShipment, getMotInfo, getMOT, motLabel,
  getDestCountry, getSoldToName, getShipToName, getConsigneeName,
  getDeliveryLocation, getTariffServiceCode, getIncoterm, getCurrency,
  getTermsOfSaleDescription, getItemsCount, getContainerCount, getDeliveries,
  getRSD, getDate002, getRoutingNumber, getIscOfPayload, fmtIsc, fmtSAPDate, fmtTs,
  getInstructions, entityLabel, gmidOfItem, ladingOfItem, deliveryOfItem,
} from "@/lib/parse-helpers";
import { AnnotatedJsonTab } from "./annotated-json";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function DetailPanel({ row, activeTab, setActiveTab, onClose }: {
  row: any; activeTab: string; setActiveTab: (t: string) => void; onClose: () => void;
}) {
  const p = row.payload || {};
  const po = getPO(p);
  const [size, setSize] = useState<"default" | "full">("default");
  const tabs = [
    { id: "key", label: "Campos clave" },
    { id: "entities", label: `Entidades (${(p.Entities || []).length})` },
    { id: "items", label: `Items (${(p.Items || []).length})` },
    { id: "instr", label: "Instrucciones" },
    { id: "raw", label: "JSON crudo" },
    { id: "annotated", label: "JSON ✦" },
  ];
  const widthClass = size === "full" ? "w-[95vw]" : "w-[60vw] min-w-[640px]";
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()} className={`relative bg-white ${widthClass} shadow-2xl flex flex-col h-full border-l border-slate-200 transition-[width] duration-150`}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-slate-500">{getOrderType(po)} · MOT {motLabel(getMOT(p))}</div>
            <h2 className="mono text-lg font-semibold mt-0.5 truncate">{stripZeros(po) || "(sin PO)"}</h2>
            <p className="text-xs text-slate-500 mt-0.5 mono truncate">Shipment: {stripZeros(getShipment(p)) || "—"} · received {fmtTs(row.received_at)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setSize(s => s === "full" ? "default" : "full")}
              className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700">
              {size === "full" ? "↘ Reducir" : "↗ Expandir"}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
          </div>
        </div>
        <div className="border-b border-slate-200 px-5 flex gap-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`py-2.5 text-sm font-medium border-b-2 transition ${activeTab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === "key" && <KeyFieldsTab payload={p} eventId={row.id} hash={row.payload_hash} bytes={row.payload_size_bytes} />}
          {activeTab === "entities" && <EntitiesTab payload={p} />}
          {activeTab === "items" && <ItemsTab payload={p} />}
          {activeTab === "instr" && <InstructionsTab payload={p} />}
          {activeTab === "raw" && <RawTab payload={p} />}
          {activeTab === "annotated" && <AnnotatedJsonTab payload={p} />}
        </div>
      </div>
    </div>
  );
}

function KeyRow({ label, value, path }: { label: string; value: React.ReactNode; path: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4 text-sm text-slate-600 align-top w-44">{label}</td>
      <td className="py-2 pr-4 mono text-sm align-top">{value ?? <span className="text-slate-400">—</span>}</td>
      <td className="py-2 mono text-xs text-slate-400 align-top">{path}</td>
    </tr>
  );
}

function KeyFieldsTab({ payload, eventId, hash, bytes }: { payload: any; eventId: string; hash: string; bytes: number }) {
  const po = getPO(payload);
  const mot = getMotInfo(payload);
  const deliveries = getDeliveries(payload);
  const instr = getInstructions(payload);
  const instrPreview = instr ? (instr.length > 120 ? instr.slice(0, 120) + "…" : instr) : null;
  return (
    <div className="p-5 space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs mono text-slate-600">
        event_id: <span className="text-slate-900">{eventId}</span><br />
        payload_hash: <span className="text-slate-900">{hash}</span><br />
        payload_size: <span className="text-slate-900">{(bytes || 0).toLocaleString()} bytes</span>
      </div>
      <table className="w-full">
        <thead className="text-xs uppercase tracking-wider text-slate-500">
          <tr><th className="text-left pb-2 font-medium">Campo</th><th className="text-left pb-2 font-medium">Valor</th><th className="text-left pb-2 font-medium">Path en JSON</th></tr>
        </thead>
        <tbody>
          <KeyRow label="PO Number" value={stripZeros(po)} path="ReferenceIdentificationGeneral[Qualifier='PO'].ReferenceIdentification" />
          <KeyRow label="Tipo de orden" value={getOrderType(po)} path="(derivado de PO: 4=STO, 1=Trade)" />
          <KeyRow label="Shipment Number" value={stripZeros(getShipment(payload))} path="ShipmnetIdentificationNumber" />
          <KeyRow label="Routing Number" value={getRoutingNumber(payload)} path="RoutingNumber" />
          <KeyRow label="MOT" value={<span>{mot.label} <span className={`not-mono text-xs ${mot.source === "ISC" ? "text-emerald-600" : mot.source === "RouteDescription" ? "text-amber-600" : "text-slate-500"}`}>({mot.source === "ISC" ? `ISC=${mot.iscUsed}` : mot.source === "MOT_code" ? "TransportationMethodTypeCode" : mot.source === "RouteDescription" ? "RouteDescription, inferido" : "?"})</span></span>} path="Items[0].ContainerDetails[0].IntermodalServiceCode → RouteInformation[0].TransportationMethodTypeCode → RouteDescription" />
          <KeyRow label="Shipping Type (ISC)" value={fmtIsc(getIscOfPayload(payload))} path="Items[0].ContainerDetails[0].IntermodalServiceCode" />
          <KeyRow label="País destino" value={getDestCountry(payload)} path="Entities[EntityIdentifier='ST'].CountryCode" />
          <KeyRow label="Sold-to (CN→BT)" value={getSoldToName(payload)} path="Entities[EntityIdentifier='CN'].Name (fallback BT)" />
          <KeyRow label="Ship-to (ST)" value={getShipToName(payload)} path="Entities[EntityIdentifier='ST'].Name" />
          <KeyRow label="Consignee (CN→N1)" value={getConsigneeName(payload)} path="Entities[EntityIdentifier='CN'].Name (fallback N1)" />
          <KeyRow label="Delivery Location" value={getDeliveryLocation(payload)} path="DeliveryLocation" />
          <KeyRow label="Place Of Delivery" value={payload?.PlaceOfDelivery} path="PlaceOfDelivery (UN/LOCODE)" />
          <KeyRow label="Place Of Receipt Code" value={payload?.PlaceOfReceiptCode} path="PlaceOfReceiptCode" />
          <KeyRow label="Tariff Service Code" value={getTariffServiceCode(payload)} path="TariffServiceCode (DD=Trade, DP=STO)" />
          <KeyRow label="Incoterm" value={getIncoterm(payload)} path="TransportationTermsCode" />
          <KeyRow label="Currency" value={getCurrency(payload)} path="CurrencyCode" />
          <KeyRow label="Terms of Sale" value={getTermsOfSaleDescription(payload)} path="TermsOfSaleDescription" />
          <KeyRow label="Items count" value={getItemsCount(payload)} path="Items.length" />
          <KeyRow label="Contenedores" value={getContainerCount(payload)} path="Items.length (cada item = 1 delivery = 1 contenedor)" />
          <KeyRow label="Deliveries SAP" value={deliveries.length ? deliveries.join(" · ") : "—"} path="Items[].ItemIdentification[0].ProductServiceIDQualifierVo (deduplicado)" />
          <KeyRow label="Instrucciones al forwarder" value={instrPreview || "—"} path="BusinessInstructionsReferenceNumberNotes" />
          <KeyRow label="Requested Ship Date" value={fmtSAPDate(getRSD(payload))} path="DateTimeReference[Qualifier='RSD'].Date" />
          <KeyRow label="Fecha 002" value={fmtSAPDate(getDate002(payload))} path="DateTimeReference[Qualifier='002'].Date" />
        </tbody>
      </table>
    </div>
  );
}

function EntitiesTab({ payload }: { payload: any }) {
  const ents = payload?.Entities || [];
  if (!ents.length) return <div className="p-5 text-slate-400 italic">Sin entidades.</div>;
  return (
    <div className="p-5 space-y-3">
      {ents.map((e: any, i: number) => (
        <div key={i} className="border border-slate-200 rounded-lg p-3 text-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Pill color="blue">{entityLabel(e.EntityIdentifier)}</Pill>
              <span className="font-semibold">{e.Name || "—"}</span>
            </div>
            <span className="mono text-xs text-slate-400">{e.IdentificationCode || ""}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div><span className="text-slate-500">Dirección:</span> <span className="mono">{e.AddressInformation || "—"}</span></div>
            <div><span className="text-slate-500">Ciudad:</span> <span className="mono">{e.CityName || "—"}</span></div>
            <div><span className="text-slate-500">CP:</span> <span className="mono">{e.PostalCode || "—"}</span></div>
            <div><span className="text-slate-500">País:</span> <span className="mono">{e.CountryCode || "—"} {e.LocationIdentifier ? `(${e.LocationIdentifier})` : ""}</span></div>
            {e.TAXID && <div className="col-span-2"><span className="text-slate-500">TAX ID:</span> <span className="mono">{e.TAXID}</span></div>}
          </div>
          {Array.isArray(e.Contacts) && e.Contacts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-1">Contactos:</div>
              {e.Contacts.map((c: any, j: number) => (
                <div key={j} className="text-xs mono text-slate-700">
                  {c.Name} · {c.ElectronicMail || "—"} {c.Telephone ? `· ${c.Telephone}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ItemsTab({ payload }: { payload: any }) {
  const items = payload?.Items || [];
  if (!items.length) return <div className="p-5 text-slate-400 italic">Sin items.</div>;
  return (
    <div className="p-5 space-y-3">
      {items.map((it: any, i: number) => {
        const cd = it?.ContainerDetails || [];
        const qw = it?.QuantityAndWeight?.[0] || {};
        const totalCont = cd.reduce((s: number, c: any) => s + (typeof c.NumberOfContainers === "number" ? c.NumberOfContainers : parseInt(c.NumberOfContainers || 0, 10) || 0), 0);
        const gmid = gmidOfItem(it);
        const lading = ladingOfItem(it);
        const delivery = stripZeros(deliveryOfItem(it));
        const containerType = cd[0]?.EquipmentType || "—";
        return (
          <div key={i} className="border border-slate-200 rounded-lg p-3 text-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Item #{i + 1}</span>
                <div className="font-semibold">{lading || "—"}</div>
                <div className="mono text-xs text-slate-500 mt-0.5">
                  GMID: <span className="text-slate-700 font-medium">{gmid || "—"}</span>
                  {" · "}Delivery: <span className="text-slate-700 font-medium">{delivery || "—"}</span>
                </div>
              </div>
              <Pill color={totalCont > 0 ? "green" : "slate"}>{totalCont} × {containerType}</Pill>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div className="bg-slate-50 rounded px-2 py-1.5"><div className="text-slate-500">Net Weight</div><div className="mono font-medium">{qw.ActualNetWeight ?? "—"} kg</div></div>
              <div className="bg-slate-50 rounded px-2 py-1.5"><div className="text-slate-500">Gross Weight</div><div className="mono font-medium">{qw.GrossWeight ?? "—"} kg</div></div>
              <div className="bg-slate-50 rounded px-2 py-1.5"><div className="text-slate-500">Volume</div><div className="mono font-medium">{qw.Volume ?? "—"} m³</div></div>
              <div className="bg-slate-50 rounded px-2 py-1.5"><div className="text-slate-500">Lading Qty</div><div className="mono font-medium">{qw.LadingQuantity ?? "—"} {qw.PackagingFormCode || ""}</div></div>
              <div className="bg-slate-50 rounded px-2 py-1.5"><div className="text-slate-500">Unit Price</div><div className="mono font-medium">{it?.PricingInformationUnitPrice ?? "—"} {it?.ExchangeRateCurrencyCode || ""}</div></div>
              <div className="bg-slate-50 rounded px-2 py-1.5"><div className="text-slate-500">Monto total</div><div className="mono font-medium">{it?.PricingInformationMonetaryAmount ?? "—"} {it?.ExchangeRateCurrencyCode || ""}</div></div>
            </div>
            {cd.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Container details ({cd.length})</div>
                <div className="space-y-1">
                  {cd.map((c: any, j: number) => (
                    <div key={j} className="mono text-xs flex flex-wrap items-center gap-3 text-slate-700">
                      <span>n={c.NumberOfContainers}</span>
                      <span className="text-slate-400">·</span>
                      <span>type=<strong>{c.EquipmentType || "—"}</strong></span>
                      <span className="text-slate-400">·</span>
                      <span>num=<strong>{c.EquipmentNumber || "—"}</strong></span>
                      <span className="text-slate-400">·</span>
                      <span>seal=<strong>{c.SealNumber || "—"}</strong></span>
                      <span className="text-slate-400">·</span>
                      <span>service=<strong>{c.IntermodalServiceCode || "—"}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {it?.Remarks && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                <div className="text-slate-500 mb-1">Remarks</div>
                <div className="text-slate-700 whitespace-pre-wrap">{it.Remarks}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InstructionsTab({ payload }: { payload: any }) {
  const text = getInstructions(payload);
  const copy = () => { if (text) navigator.clipboard?.writeText(text); };
  if (!text) return <div className="p-5 text-slate-500 italic">Sin instrucciones en esta orden.</div>;
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Instrucciones al forwarder</h3>
        <button onClick={copy} className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded">Copiar</button>
      </div>
      <pre className="mono text-xs bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-lg whitespace-pre-wrap break-words leading-relaxed">{text}</pre>
      <p className="mono text-xs text-slate-400">Path: BusinessInstructionsReferenceNumberNotes</p>
    </div>
  );
}

function RawTab({ payload }: { payload: any }) {
  const text = JSON.stringify(payload, null, 2);
  const copy = () => { navigator.clipboard?.writeText(text); };
  return (
    <div className="p-5">
      <div className="flex justify-end mb-2">
        <button onClick={copy} className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded">Copiar JSON</button>
      </div>
      <pre className="mono text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto scrollbar-thin whitespace-pre">{text}</pre>
    </div>
  );
}
