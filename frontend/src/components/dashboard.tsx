"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { StatCard, Pill, Toast } from "./ui";
import { DetailPanel } from "./detail-panel";
import { AnomaliesView } from "./anomalies-view";
import { ByClientView } from "./by-client-view";
import { CompareView } from "./compare-view";
import { AgentView } from "./agent-view";
import { fetchEvents, type InboundEvent } from "@/lib/supabase";
import {
  stripZeros, getPO, getOrderType, getShipment, getMotInfo, motLabel,
  getDestCountry, getDestFallback, getSoldToName, getShipToName,
  getItemsCount, getContainerCount, getRSD, fmtSAPDate, fmtTs,
} from "@/lib/parse-helpers";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EnrichedRow extends InboundEvent {
  _po: string | null;
  _orderType: string;
  _shipment: string | null;
  _mot: string;
  _motLabel: string;
  _motInferred: boolean;
  _dest: string | null;
  _destFallback: string;
  _soldTo: string | null;
  _shipTo: string | null;
  _items: number;
  _containers: number;
  _rsd: string;
}

const SUPABASE_URL = "https://cctuowthpnstvdgjuomq.supabase.co";

export function Dashboard() {
  const [rows, setRows] = useState<InboundEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchSoldTo, setSearchSoldTo] = useState("");
  const [searchShipTo, setSearchShipTo] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMot, setFilterMot] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [selected, setSelected] = useState<EnrichedRow | null>(null);
  const [activeTab, setActiveTab] = useState("key");
  const [view, setView] = useState("list");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareReason, setCompareReason] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvents();
      setRows(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const enriched = useMemo<EnrichedRow[]>(() => rows.map(r => {
    const p = r.payload || {};
    const po = getPO(p);
    const motI = getMotInfo(p);
    return {
      ...r,
      _po: po,
      _orderType: getOrderType(po),
      _shipment: getShipment(p),
      _mot: motI.code,
      _motLabel: motI.label,
      _motInferred: motI.inferred,
      _dest: getDestCountry(p),
      _destFallback: getDestFallback(p),
      _soldTo: getSoldToName(p),
      _shipTo: getShipToName(p),
      _items: getItemsCount(p),
      _containers: getContainerCount(p),
      _rsd: fmtSAPDate(getRSD(p)),
    };
  }), [rows]);

  const countries = useMemo(() => {
    const s = new Set<string>();
    enriched.forEach(r => { if (r._dest) s.add(r._dest); });
    return Array.from(s).sort();
  }, [enriched]);

  const motValues = useMemo(() => {
    const s = new Set<string>();
    enriched.forEach(r => { if (r._mot) s.add(r._mot); });
    return Array.from(s).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qSold = searchSoldTo.trim().toLowerCase();
    const qShip = searchShipTo.trim().toLowerCase();
    return enriched.filter(r => {
      if (filterType !== "all" && r._orderType !== filterType) return false;
      if (filterMot !== "all" && r._mot !== filterMot) return false;
      if (filterCountry !== "all" && r._dest !== filterCountry) return false;
      if (q) {
        const hay = `${r._po || ""} ${r._shipment || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (qSold && !(r._soldTo || "").toLowerCase().includes(qSold)) return false;
      if (qShip && !(r._shipTo || "").toLowerCase().includes(qShip)) return false;
      return true;
    });
  }, [enriched, search, searchSoldTo, searchShipTo, filterType, filterMot, filterCountry]);

  const stats = useMemo(() => {
    const sto = enriched.filter(r => r._orderType === "STO").length;
    const trade = enriched.filter(r => r._orderType === "Trade").length;
    const maritime = enriched.filter(r => r._mot === "O").length;
    return { total: enriched.length, sto, trade, maritime };
  }, [enriched]);

  const orderTypeColor = (t: string) => t === "STO" ? "purple" : t === "Trade" ? "blue" : "slate";
  const motColor = (m: string) => m === "O" ? "green" : m === "M" ? "amber" : "slate";

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Explorador 304</h1>
            <p className="text-xs text-slate-500 mt-0.5">SSB Export Control · {SUPABASE_URL.replace("https://", "").split(".")[0]}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-md border border-slate-300 overflow-hidden text-sm">
              <button onClick={() => setView("list")} className={`px-3 py-1.5 font-medium transition ${view === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>Lista</button>
              <button onClick={() => setView("by_client")} className={`px-3 py-1.5 font-medium transition border-l border-slate-300 ${view === "by_client" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>Por Cliente</button>
              <button onClick={() => setView("compare")} className={`px-3 py-1.5 font-medium transition border-l border-slate-300 ${view === "compare" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
                Comparar {compareIds.length > 0 && <span className={`ml-1 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${view === "compare" ? "bg-white text-slate-900" : "bg-slate-200"}`}>{compareIds.length}</span>}
              </button>
              <button onClick={() => setView("anomalies")} className={`px-3 py-1.5 font-medium transition border-l border-slate-300 ${view === "anomalies" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>Anomalías</button>
              <button onClick={() => setView("agent")} className={`px-3 py-1.5 font-medium transition border-l border-slate-300 ${view === "agent" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>Agente IA</button>
            </div>
            <button onClick={reload} className="px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 transition" disabled={loading}>
              {loading ? "Cargando…" : "Recargar"}
            </button>
          </div>
        </div>
      </header>

      {view === "compare" && (
        <main className="w-full px-4 py-6 space-y-4">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-sm max-w-[1600px] mx-auto"><strong>Error al cargar:</strong> <span className="mono">{error}</span></div>}
          <CompareView rows={enriched} compareIds={compareIds} setCompareIds={setCompareIds} setToast={(m) => setToast(m)} compareReason={compareReason} setCompareReason={setCompareReason} />
        </main>
      )}

      {view !== "compare" && (
        <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-4">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-sm"><strong>Error al cargar:</strong> <span className="mono">{error}</span></div>}

          {view === "agent" && <AgentView rows={enriched} />}
          {view === "by_client" && <ByClientView rows={enriched} />}
          {view === "anomalies" && <AnomaliesView rows={enriched} setCompareIds={setCompareIds} setView={setView} setToast={(m) => setToast(m)} setCompareReason={setCompareReason} />}

          {view === "list" && <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total" value={stats.total} />
              <StatCard label="STO" value={stats.sto} accent="text-violet-600" />
              <StatCard label="Trade" value={stats.trade} accent="text-blue-600" />
              <StatCard label="Marítimo" value={stats.maritime} accent="text-emerald-600" />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Búsqueda (PO o Shipment)</label>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="0118531879 / 0048067849 …"
                  className="mono w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
                  <option value="all">Todos</option><option value="STO">STO</option><option value="Trade">Trade</option><option value="Unknown">Unknown</option><option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">MOT</label>
                <select value={filterMot} onChange={e => setFilterMot(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
                  <option value="all">Todos</option>
                  {motValues.map(m => <option key={m} value={m}>{m} — {motLabel(m)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">País destino</label>
                <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
                  <option value="all">Todos</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Sold-to (CN→BT)</label>
                <input type="text" value={searchSoldTo} onChange={e => setSearchSoldTo(e.target.value)} placeholder="dow / parnaplast …"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Ship-to (ST)</label>
                <input type="text" value={searchShipTo} onChange={e => setSearchShipTo(e.target.value)} placeholder="extrema / valgroup …"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="text-xs text-slate-500 ml-auto">Mostrando <span className="font-semibold text-slate-700">{filtered.length}</span> / {enriched.length}</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold">PO Number</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Tipo</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Shipment</th>
                      <th className="text-left px-3 py-2.5 font-semibold">MOT</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Destino</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Sold-to</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Ship-to</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Items</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Cont.</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Recibido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading && <tr><td colSpan={10} className="text-center py-8 text-slate-400">Cargando…</td></tr>}
                    {!loading && filtered.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-slate-400">Sin resultados</td></tr>}
                    {!loading && filtered.map(r => (
                      <tr key={r.id} onClick={() => { setSelected(r); setActiveTab("key"); }} className="hover:bg-blue-50 cursor-pointer transition">
                        <td className="mono px-3 py-2 font-medium">{stripZeros(r._po) || "—"}</td>
                        <td className="px-3 py-2"><Pill color={orderTypeColor(r._orderType)}>{r._orderType}</Pill></td>
                        <td className="mono px-3 py-2 text-slate-600">{stripZeros(r._shipment) || "—"}</td>
                        <td className="px-3 py-2"><Pill color={motColor(r._mot)}>{r._motLabel}</Pill></td>
                        <td className="px-3 py-2">{r._dest || <span className="text-slate-400 italic">{r._destFallback}</span>}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[220px] truncate" title={r._soldTo || ""}>{r._soldTo || "—"}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[220px] truncate" title={r._shipTo || ""}>{r._shipTo || "—"}</td>
                        <td className="mono px-3 py-2 text-right">{r._items}</td>
                        <td className="mono px-3 py-2 text-right">{r._containers}</td>
                        <td className="mono px-3 py-2 text-slate-600 text-xs">{fmtTs(r.received_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>}
        </main>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      {selected && <DetailPanel row={selected} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSelected(null)} />}
    </div>
  );
}
