"use client";

import { useState, useMemo, Fragment } from "react";
import { Pill } from "./ui";
import {
  stripZeros, getPO, getOrderType, getShipment, getMotInfo, getIncoterm,
  getTariffServiceCode, getDestCountry, getDeliveryLocation, getSoldToName,
  getShipToName, getConsigneeName, getItemsCount, getContainerCount,
  getDeliveries, getRSD, getDate002, fmtSAPDate, fmtIsc, getInstructions,
  gmidOfItem, ladingOfItem, deliveryOfItem, motLabel,
} from "@/lib/parse-helpers";
import type { EnrichedRow } from "./dashboard";

/* eslint-disable @typescript-eslint/no-explicit-any */

const COMPARE_FIELDS = [
  { key: "po", label: "PO Number" }, { key: "type", label: "Tipo" }, { key: "shipment", label: "Shipment" },
  { key: "mot", label: "MOT" }, { key: "incoterm", label: "Incoterm" }, { key: "tariff", label: "Tariff Service" },
  { key: "country", label: "País destino" }, { key: "delivery_loc", label: "Delivery Location" },
  { key: "sold_to", label: "Sold-to (CN→BT)" }, { key: "ship_to", label: "Ship-to (ST)" },
  { key: "consignee", label: "Consignee (CN→N1)" }, { key: "items", label: "Items count" },
  { key: "containers", label: "Contenedores" }, { key: "deliveries", label: "Deliveries" },
  { key: "rsd", label: "Fecha RSD" }, { key: "d002", label: "Fecha 002" },
];

function compareValueOf(row: any, key: string): string | null {
  const p = row.payload || {};
  const po = getPO(p);
  switch (key) {
    case "po": return stripZeros(po);
    case "type": return getOrderType(po);
    case "shipment": return stripZeros(getShipment(p));
    case "mot": return getMotInfo(p).label;
    case "incoterm": return getIncoterm(p);
    case "tariff": return getTariffServiceCode(p);
    case "country": return getDestCountry(p);
    case "delivery_loc": return getDeliveryLocation(p);
    case "sold_to": return getSoldToName(p);
    case "ship_to": return getShipToName(p);
    case "consignee": return getConsigneeName(p);
    case "items": return String(getItemsCount(p));
    case "containers": return String(getContainerCount(p));
    case "deliveries": return getDeliveries(p).join(" · ");
    case "rsd": return fmtSAPDate(getRSD(p));
    case "d002": return fmtSAPDate(getDate002(p));
    default: return null;
  }
}

const COMPARE_ITEM_FIELDS = [
  { key: "gmid", label: "GMID" }, { key: "lading", label: "Descripción" },
  { key: "delivery", label: "Delivery #" }, { key: "isc", label: "Shipping Type (ISC)" },
  { key: "lading_qty", label: "Cantidad" }, { key: "net_weight", label: "Net weight" },
  { key: "gross_weight", label: "Gross weight" }, { key: "unit_price", label: "Precio unitario" },
  { key: "total_amount", label: "Monto total" }, { key: "equip_type", label: "EquipmentType" },
  { key: "n_containers", label: "n containers" },
];

function itemFieldValue(it: any, key: string): string | null {
  if (!it) return null;
  const cd = it?.ContainerDetails || [];
  const qw = it?.QuantityAndWeight?.[0] || {};
  switch (key) {
    case "gmid": return gmidOfItem(it);
    case "lading": return ladingOfItem(it);
    case "delivery": return stripZeros(deliveryOfItem(it));
    case "isc": return cd[0]?.IntermodalServiceCode ? fmtIsc(cd[0].IntermodalServiceCode) : null;
    case "lading_qty": return qw.LadingQuantity != null ? `${qw.LadingQuantity}${qw.PackagingFormCode ? " " + qw.PackagingFormCode : ""}` : null;
    case "net_weight": return qw.ActualNetWeight != null ? `${qw.ActualNetWeight} kg` : null;
    case "gross_weight": return qw.GrossWeight != null ? `${qw.GrossWeight} kg` : null;
    case "unit_price": return it?.PricingInformationUnitPrice != null ? `${it.PricingInformationUnitPrice} ${it?.ExchangeRateCurrencyCode || ""}`.trim() : null;
    case "total_amount": return it?.PricingInformationMonetaryAmount != null ? `${it.PricingInformationMonetaryAmount} ${it?.ExchangeRateCurrencyCode || ""}`.trim() : null;
    case "equip_type": return cd[0]?.EquipmentType || null;
    case "n_containers": return cd[0]?.NumberOfContainers != null ? String(cd[0].NumberOfContainers) : null;
    default: return null;
  }
}

const COMPARE_REASON_CONFIG: Record<string, { icon: string; text: string; highlightFields: Set<string>; highlightItemFields?: Set<string> }> = {
  ior_activo: { icon: "🔵", text: "Revisá: Sold-to (BT vs CN) — la columna está resaltada en azul.", highlightFields: new Set(["sold_to", "ship_to", "consignee"]) },
  entidades_faltantes: { icon: "🔴", text: "Revisá: BT / ST / N1 — pueden estar ausentes en órdenes marcadas.", highlightFields: new Set(["sold_to", "ship_to", "consignee"]) },
  isc_mixto: { icon: "🟡", text: "Revisá: Shipping Type (ISC) — los items tienen valores distintos.", highlightFields: new Set([]), highlightItemFields: new Set(["isc"]) },
};

export function CompareView({ rows, compareIds, setCompareIds, setToast, compareReason, setCompareReason }: {
  rows: EnrichedRow[];
  compareIds: string[];
  setCompareIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setToast: (msg: string) => void;
  compareReason: string | null;
  setCompareReason: (r: string | null) => void;
}) {
  const MAX = 6;
  const reasonCfg = compareReason ? COMPARE_REASON_CONFIG[compareReason] : null;
  const indexed = useMemo(() => { const m = new Map<string, EnrichedRow>(); rows.forEach(r => m.set(r.id, r)); return m; }, [rows]);
  const selected = compareIds.map(id => indexed.get(id)).filter(Boolean) as EnrichedRow[];

  const [sideDest, setSideDest] = useState("");
  const [sideMot, setSideMot] = useState("all");

  const sideFiltered = useMemo(() => {
    const q = sideDest.trim().toLowerCase();
    return rows.filter(r => {
      if (sideMot !== "all" && r._mot !== sideMot) return false;
      if (q) {
        const hay = `${r._dest || ""} ${r._destFallback || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, sideDest, sideMot]);

  const toggle = (id: string) => {
    setCompareIds((prev: string[]) => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX) { setToast(`Máximo ${MAX} órdenes a comparar`); return prev; }
      return [...prev, id];
    });
  };
  const selectAll = () => {
    const ids = sideFiltered.slice(0, MAX).map(r => r.id);
    if (sideFiltered.length > MAX) setToast(`Solo se seleccionaron las primeras ${MAX} del filtro`);
    setCompareIds(ids);
  };
  const clearAll = () => setCompareIds([]);

  const maxItems = useMemo(() => selected.reduce((m, r) => Math.max(m, ((r.payload as any)?.Items || []).length), 0), [selected]);

  return (
    <div className="grid grid-cols-[260px_1fr] gap-4 h-[calc(100vh-160px)]">
      <aside className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">Órdenes ({compareIds.length}/{MAX})</span>
          <div className="flex gap-1">
            <button onClick={selectAll} className="text-xs px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded">Todas</button>
            <button onClick={clearAll} className="text-xs px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded">Limpiar</button>
          </div>
        </div>
        <div className="px-3 py-2 border-b border-slate-200 space-y-2 bg-slate-50">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Destino</label>
            <input type="text" value={sideDest} onChange={e => setSideDest(e.target.value)} placeholder="BR / SANTOS / port…"
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">MOT</label>
            <select value={sideMot} onChange={e => setSideMot(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-xs">
              <option value="all">Todos</option><option value="O">Marítimo</option><option value="M">Terrestre</option><option value="A">Aéreo</option>
            </select>
          </div>
          <div className="text-[10px] text-slate-500">{sideFiltered.length} / {rows.length} en el listado</div>
        </div>
        <div className="overflow-y-auto scrollbar-thin flex-1">
          {sideFiltered.map(r => {
            const checked = compareIds.includes(r.id);
            return (
              <label key={r.id} className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${checked ? "bg-blue-50" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="cursor-pointer" />
                <span className="mono flex-1 text-xs">{stripZeros(r._po) || "—"}</span>
                <Pill color={r._orderType === "STO" ? "purple" : r._orderType === "Trade" ? "blue" : "slate"}>{r._orderType}</Pill>
              </label>
            );
          })}
          {sideFiltered.length === 0 && <div className="text-xs text-slate-400 italic px-3 py-3">{rows.length === 0 ? "Sin órdenes cargadas." : "Sin resultados para el filtro."}</div>}
        </div>
      </aside>

      <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-w-0">
        {compareReason && reasonCfg && (
          <div className="px-4 py-2 bg-blue-100 border-b border-blue-300 text-sm text-blue-900 flex items-center justify-between gap-3">
            <span><span className="mr-1">{reasonCfg.icon}</span> {reasonCfg.text}</span>
            <button onClick={() => setCompareReason(null)} className="text-xs px-2 py-0.5 hover:bg-blue-200 rounded shrink-0">×</button>
          </div>
        )}
        {selected.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
            Seleccioná hasta {MAX} órdenes en la lista de la izquierda para compararlas.
          </div>
        ) : (
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="text-sm border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider text-slate-600 border-b border-slate-200 sticky left-0 bg-slate-100 z-20 min-w-[180px]">Campo</th>
                  {selected.map((r, i) => {
                    const p = r.payload || {};
                    const po = getPO(p);
                    const mi = getMotInfo(p);
                    return (
                      <th key={r.id} className={`text-left px-3 py-2 border-b border-slate-200 min-w-[260px] ${i === 0 ? "bg-blue-50" : "bg-slate-100"}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="mono font-semibold text-slate-900">{stripZeros(po) || "—"}</span>
                          <Pill color={getOrderType(po) === "STO" ? "purple" : getOrderType(po) === "Trade" ? "blue" : "slate"}>{getOrderType(po)}</Pill>
                          <Pill color={mi.code === "O" ? "green" : mi.code === "M" ? "amber" : "slate"}>{mi.label}</Pill>
                        </div>
                        {i === 0 && <div className="text-[10px] uppercase tracking-wider text-blue-700 mt-0.5">referencia</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-50 sticky top-[44px] z-[5]">
                  <td colSpan={selected.length + 1} className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200 sticky left-0">Cabecera</td>
                </tr>
                {COMPARE_FIELDS.map(f => {
                  const refVal = compareValueOf(selected[0], f.key);
                  const hl = reasonCfg?.highlightFields?.has(f.key);
                  return (
                    <tr key={f.key} className={`border-b border-slate-100 ${hl ? "border-l-4 border-l-blue-400" : ""}`}>
                      <td className={`px-3 py-2 text-xs font-medium sticky left-0 border-r border-slate-100 align-top ${hl ? "text-blue-900 bg-blue-50 font-semibold" : "text-slate-600 bg-white"}`}>{f.label}</td>
                      {selected.map((r, i) => {
                        const v = compareValueOf(r, f.key);
                        const diff = i > 0 && (v ?? "") !== (refVal ?? "");
                        const display = !v ? <span className="text-slate-300 italic">—</span> : v;
                        const cellBg = diff ? "bg-rose-50 text-rose-900" : hl ? "bg-blue-50 text-blue-900" : "";
                        return <td key={r.id} className={`mono px-3 py-2 text-xs align-top whitespace-pre-wrap break-words ${cellBg}`}>{display}</td>;
                      })}
                    </tr>
                  );
                })}
                <tr className="bg-slate-50">
                  <td colSpan={selected.length + 1} className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200 sticky left-0">Instrucciones al forwarder</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-xs font-medium text-slate-600 sticky left-0 bg-white border-r border-slate-100 align-top">Texto completo</td>
                  {selected.map((r, i) => {
                    const refTxt = getInstructions(selected[0]?.payload || {}) || "";
                    const txt = getInstructions(r.payload || {}) || "";
                    const diff = i > 0 && txt !== refTxt;
                    return (
                      <td key={r.id} className={`px-3 py-2 align-top ${diff ? "bg-rose-50" : ""}`}>
                        {txt ? <pre className={`mono text-[11px] leading-snug whitespace-pre-wrap break-words p-2 rounded border ${diff ? "border-rose-200 text-rose-900 bg-rose-50" : "border-slate-200 text-slate-800 bg-slate-50"} max-h-[260px] overflow-y-auto scrollbar-thin`}>{txt}</pre>
                          : <span className="text-slate-300 italic text-xs">—</span>}
                      </td>
                    );
                  })}
                </tr>
                {maxItems > 0 && Array.from({ length: maxItems }).map((_, idx) => {
                  const itemsByOrder = selected.map(r => ((r.payload as any)?.Items || [])[idx] || null);
                  const refItem = itemsByOrder[0];
                  return (
                    <Fragment key={`item-block-${idx}`}>
                      <tr className="bg-slate-50">
                        <td colSpan={selected.length + 1} className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200 sticky left-0">Item #{idx + 1}</td>
                      </tr>
                      {COMPARE_ITEM_FIELDS.map(f => {
                        const refVal = itemFieldValue(refItem, f.key);
                        const hlItem = reasonCfg?.highlightItemFields?.has(f.key);
                        return (
                          <tr key={`item-${idx}-${f.key}`} className={`border-b border-slate-100 ${hlItem ? "border-l-4 border-l-blue-400" : ""}`}>
                            <td className={`px-3 py-2 text-xs font-medium sticky left-0 border-r border-slate-100 align-top ${hlItem ? "text-blue-900 bg-blue-50 font-semibold" : "text-slate-600 bg-white"}`}>{f.label}</td>
                            {itemsByOrder.map((it, i) => {
                              const v = itemFieldValue(it, f.key);
                              const diff = i > 0 && (v ?? "") !== (refVal ?? "");
                              const display = !v ? <span className="text-slate-300 italic">—</span> : v;
                              const cellBg = diff ? "bg-rose-50 text-rose-900" : hlItem ? "bg-blue-50 text-blue-900" : "";
                              return <td key={selected[i].id + "-" + idx + "-" + f.key} className={`mono px-3 py-2 text-xs align-top whitespace-pre-wrap break-words ${cellBg}`}>{display}</td>;
                            })}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
