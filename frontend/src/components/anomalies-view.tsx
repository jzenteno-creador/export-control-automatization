"use client";

import { useState, useMemo } from "react";
import { Pill, StatCard } from "./ui";
import { ANOMALY_TYPES, detectAnomalies } from "@/lib/anomalies";
import { stripZeros, getAllIscOfPayload } from "@/lib/parse-helpers";
import type { EnrichedRow } from "./dashboard";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function AnomaliesView({ rows, setCompareIds, setView, setToast, setCompareReason }: {
  rows: EnrichedRow[];
  setCompareIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setView: (v: string) => void;
  setToast: (msg: string) => void;
  setCompareReason: (r: string | null) => void;
}) {
  const MAX_COMPARE = 6;

  const analysis = useMemo(() => {
    const byType = Object.fromEntries(ANOMALY_TYPES.map(t => [t.key, [] as { row: EnrichedRow; missing: string[] }[]]));
    let totalAffected = 0;
    for (const r of rows) {
      const result = detectAnomalies(r);
      if (result.types.length === 0) continue;
      totalAffected++;
      for (const t of result.types) {
        byType[t].push({ row: r, missing: result.missing });
      }
    }
    return { byType, totalAffected };
  }, [rows]);

  const [expanded, setExpanded] = useState(() => new Set(ANOMALY_TYPES.map(t => t.key)));
  const toggle = (k: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const compareGroup = (anomalyKey: string) => {
    const items = analysis.byType[anomalyKey] || [];
    const ids = items.slice(0, MAX_COMPARE).map(x => x.row.id);
    if (!ids.length) return;
    setCompareIds(ids);
    setCompareReason(anomalyKey);
    setView("compare");
    if (items.length > MAX_COMPARE) {
      setToast(`Se pre-seleccionaron las primeras ${MAX_COMPARE} de ${items.length} órdenes con esta anomalía`);
    }
  };

  const colorBySeverity: Record<string, string> = { info: "blue", high: "rose", warn: "amber" };
  const cardColor = (key: string) => {
    const t = ANOMALY_TYPES.find(x => x.key === key);
    return colorBySeverity[t?.severity || ""] || "slate";
  };
  const cardBg = (color: string) => ({ blue: "bg-blue-50 border-blue-200", rose: "bg-rose-50 border-rose-200", amber: "bg-amber-50 border-amber-200", slate: "bg-slate-50 border-slate-200" }[color] || "");
  const numberColor = (color: string) => ({ blue: "text-blue-700", rose: "text-rose-700", amber: "text-amber-700", slate: "text-slate-700" }[color] || "");

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Detección de anomalías</h2>
        <p className="text-xs text-slate-500 mt-1">{analysis.totalAffected} de {rows.length} órdenes tienen al menos una anomalía.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
          {ANOMALY_TYPES.map(t => {
            const n = (analysis.byType[t.key] || []).length;
            const color = cardColor(t.key);
            const sevIcon = t.severity === "info" ? "🔵" : t.severity === "high" ? "🔴" : "🟡";
            return (
              <button key={t.key} onClick={() => toggle(t.key)} className={`text-left rounded-lg border ${cardBg(color)} px-3 py-2 hover:opacity-90 transition`}>
                <div className="text-xs uppercase tracking-wide text-slate-600">{sevIcon} {t.label}</div>
                <div className={`text-2xl font-bold mt-0.5 ${n > 0 ? numberColor(color) : "text-slate-400"}`}>{n}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-3">
        {ANOMALY_TYPES.map(t => {
          const items = analysis.byType[t.key] || [];
          if (items.length === 0) return null;
          const isOpen = expanded.has(t.key);
          const color = cardColor(t.key);
          const sevIcon = t.severity === "info" ? "🔵" : t.severity === "high" ? "🔴" : "🟡";
          return (
            <div key={t.key} className={`rounded-lg border ${cardBg(color)} overflow-hidden`}>
              <div className="px-4 py-3 flex items-start gap-3 border-b border-slate-200 bg-white">
                <button onClick={() => toggle(t.key)} className="flex items-start gap-2 flex-1 text-left">
                  <span className={`text-slate-400 transition-transform mt-0.5 ${isOpen ? "rotate-90" : ""}`}>▶</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{sevIcon} {t.label}</span>
                      <span className="text-xs text-slate-500">({items.length})</span>
                    </div>
                    {t.description && <div className="text-xs text-slate-600 mt-1">{t.description}</div>}
                  </div>
                </button>
                <button onClick={() => compareGroup(t.key)} className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-700 font-medium shrink-0">
                  Comparar{items.length > MAX_COMPARE ? ` primeras ${MAX_COMPARE}` : ""}
                </button>
              </div>
              {isOpen && (
                <div className="bg-white overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">PO</th>
                        <th className="text-left px-4 py-2 font-semibold">Tipo</th>
                        <th className="text-left px-4 py-2 font-semibold">MOT</th>
                        <th className="text-left px-4 py-2 font-semibold">Sold-to</th>
                        <th className="text-left px-4 py-2 font-semibold">Ship-to</th>
                        <th className="text-left px-4 py-2 font-semibold">Destino</th>
                        {t.key === "entidades_faltantes" && <th className="text-left px-4 py-2 font-semibold">Faltan</th>}
                        {t.key === "isc_mixto" && <th className="text-left px-4 py-2 font-semibold">ISCs</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map(({ row, missing }) => {
                        const p = row.payload || {};
                        const iscs = Array.from(new Set(getAllIscOfPayload(p)));
                        return (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="mono px-4 py-2 font-medium">{stripZeros(row._po) || "—"}</td>
                            <td className="px-4 py-2"><Pill color={row._orderType === "STO" ? "purple" : row._orderType === "Trade" ? "blue" : "slate"}>{row._orderType}</Pill></td>
                            <td className="px-4 py-2"><Pill color={row._mot === "O" ? "green" : row._mot === "M" ? "amber" : "slate"}>{row._motLabel}</Pill></td>
                            <td className="px-4 py-2 text-slate-700 max-w-[220px] truncate" title={row._soldTo || ""}>{row._soldTo || "—"}</td>
                            <td className="px-4 py-2 text-slate-700 max-w-[220px] truncate" title={row._shipTo || ""}>{row._shipTo || "—"}</td>
                            <td className="px-4 py-2 text-slate-700">{row._dest || row._destFallback || "—"}</td>
                            {t.key === "entidades_faltantes" && <td className="mono px-4 py-2 text-rose-700 text-xs">{(missing || []).join(", ")}</td>}
                            {t.key === "isc_mixto" && <td className="mono px-4 py-2 text-amber-700 text-xs">{iscs.join(", ")}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {analysis.totalAffected === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
            <div className="text-emerald-700 font-semibold">Sin anomalías detectadas</div>
            <div className="text-xs text-emerald-600 mt-1">Las {rows.length} órdenes pasan los 6 chequeos.</div>
          </div>
        )}
      </div>
    </div>
  );
}
