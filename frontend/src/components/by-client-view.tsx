"use client";

import { useState, useMemo } from "react";
import { Pill, StatCard } from "./ui";
import { stripZeros } from "@/lib/parse-helpers";
import type { EnrichedRow } from "./dashboard";

export function ByClientView({ rows }: { rows: EnrichedRow[] }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; orders: EnrichedRow[]; totalContainers: number }>();
    for (const r of rows) {
      const key = r._soldTo || "Sin sold-to";
      if (!map.has(key)) map.set(key, { name: key, orders: [], totalContainers: 0 });
      const g = map.get(key)!;
      g.orders.push(r);
      g.totalContainers += typeof r._containers === "number" ? r._containers : 0;
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.name === "Sin sold-to") return 1;
      if (b.name === "Sin sold-to") return -1;
      return b.orders.length - a.orders.length || a.name.localeCompare(b.name);
    });
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(filtered.map(g => g.name)));
  const collapseAll = () => setExpanded(new Set());

  const totals = useMemo(() => {
    const totalOrders = filtered.reduce((s, g) => s + g.orders.length, 0);
    const totalContainers = filtered.reduce((s, g) => s + g.totalContainers, 0);
    return { clients: filtered.length, orders: totalOrders, containers: totalContainers };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Clientes" value={totals.clients} accent="text-slate-900" />
        <StatCard label="Órdenes" value={totals.orders} accent="text-blue-600" />
        <StatCard label="Contenedores totales" value={totals.containers} accent="text-emerald-600" />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Buscar cliente (Sold-to)</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="dow / parnaplast / valgroup …"
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded font-medium">Expandir todos</button>
          <button onClick={collapseAll} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded font-medium">Colapsar todos</button>
        </div>
        <div className="text-xs text-slate-500 ml-auto">{filtered.length} / {groups.length} clientes</div>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400 italic">Sin resultados.</div>}
        {filtered.map(g => {
          const isOpen = expanded.has(g.name);
          return (
            <div key={g.name} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <button onClick={() => toggle(g.name)} className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition text-left">
                <span className={`text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{g.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span className="font-medium text-blue-700">{g.orders.length}</span> {g.orders.length === 1 ? "orden" : "órdenes"}
                    {" · "}<span className="font-medium text-emerald-700">{g.totalContainers}</span> contenedores
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">PO Number</th>
                        <th className="text-left px-4 py-2 font-semibold">Tipo</th>
                        <th className="text-left px-4 py-2 font-semibold">Shipment</th>
                        <th className="text-left px-4 py-2 font-semibold">MOT</th>
                        <th className="text-left px-4 py-2 font-semibold">Fecha RSD</th>
                        <th className="text-right px-4 py-2 font-semibold">Items</th>
                        <th className="text-right px-4 py-2 font-semibold">Cont.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {g.orders.map(r => (
                        <tr key={r.id} className="hover:bg-blue-50">
                          <td className="mono px-4 py-2 font-medium">{stripZeros(r._po) || "—"}</td>
                          <td className="px-4 py-2"><Pill color={r._orderType === "STO" ? "purple" : r._orderType === "Trade" ? "blue" : "slate"}>{r._orderType}</Pill></td>
                          <td className="mono px-4 py-2 text-slate-600">{stripZeros(r._shipment) || "—"}</td>
                          <td className="px-4 py-2"><Pill color={r._mot === "O" ? "green" : r._mot === "M" ? "amber" : "slate"}>{r._motLabel}</Pill></td>
                          <td className="mono px-4 py-2 text-slate-700 text-xs">{r._rsd}</td>
                          <td className="mono px-4 py-2 text-right">{r._items}</td>
                          <td className="mono px-4 py-2 text-right">{r._containers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
