/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OutletMonthData, StockItem } from '../types/inventory';
import { playClickSound, playSuccessChime } from '../utils/audio';
import * as XLSX from 'xlsx';
import {
  CalendarRange,
  Download,
  Link2,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Search,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface MonthlyRekapViewProps {
  monthData: OutletMonthData;
  outletName: string;
  periodLabel: string;
  onLinkWeeks: (fromWeek: 'week-1' | 'week-2' | 'week-3', toWeek: 'week-2' | 'week-3' | 'week-4') => void;
  onSwitchToWeek: (weekId: 'week-1' | 'week-2' | 'week-3' | 'week-4') => void;
}

export const MonthlyRekapView: React.FC<MonthlyRekapViewProps> = ({
  monthData,
  outletName,
  periodLabel,
  onLinkWeeks,
  onSwitchToWeek,
}) => {
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  const weeks = monthData.weeks;

  // Build a consolidated unique item map across all 4 weeks
  const itemsMap = new Map<
    string,
    {
      namaBarang: string;
      warehouse: string;
      uom: string;
      w1?: StockItem;
      w2?: StockItem;
      w3?: StockItem;
      w4?: StockItem;
    }
  >();

  (['week-1', 'week-2', 'week-3', 'week-4'] as const).forEach((wId) => {
    const wItems = weeks[wId].items;
    wItems.forEach((it) => {
      const key = `${it.namaBarang.toLowerCase().trim()}_${it.warehouse.toLowerCase()}`;
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          namaBarang: it.namaBarang,
          warehouse: it.warehouse,
          uom: it.uom,
        });
      }
      const entry = itemsMap.get(key)!;
      if (wId === 'week-1') entry.w1 = it;
      if (wId === 'week-2') entry.w2 = it;
      if (wId === 'week-3') entry.w3 = it;
      if (wId === 'week-4') entry.w4 = it;
    });
  });

  const consolidatedList = Array.from(itemsMap.values()).filter((it) => {
    const matchesSearch = it.namaBarang.toLowerCase().includes(search.toLowerCase());
    const matchesWarehouse = warehouseFilter === 'all' || it.warehouse.toLowerCase() === warehouseFilter.toLowerCase();
    return matchesSearch && matchesWarehouse;
  });

  // Export full monthly consolidation to Excel
  const handleExportMonthly = () => {
    playClickSound();

    const exportRows = consolidatedList.map((row, idx) => {
      const getWInfo = (wItem?: StockItem) => {
        if (!wItem) return { sys: '-', act: '-', var: '-' };
        const hasAct = wItem.qtyActual !== '' && wItem.qtyActual !== null && wItem.qtyActual !== undefined;
        const act = hasAct ? Number(wItem.qtyActual) : '-';
        const v = hasAct ? Math.round((Number(wItem.qtyActual) - wItem.qty) * 100) / 100 : '-';
        return { sys: wItem.qty, act, var: v };
      };

      const w1 = getWInfo(row.w1);
      const w2 = getWInfo(row.w2);
      const w3 = getWInfo(row.w3);
      const w4 = getWInfo(row.w4);

      let totalVariance = 0;
      let hasAnyVar = false;
      [w1, w2, w3, w4].forEach((w) => {
        if (typeof w.var === 'number') {
          totalVariance += w.var;
          hasAnyVar = true;
        }
      });

      return {
        No: idx + 1,
        'Nama Barang': row.namaBarang,
        Warehouse: row.warehouse.toUpperCase(),
        UOM: row.uom,
        'W1 Sistem': w1.sys,
        'W1 Fisik': w1.act,
        'W1 Selisih': w1.var,
        'W2 Sistem': w2.sys,
        'W2 Fisik': w2.act,
        'W2 Selisih': w2.var,
        'W3 Sistem': w3.sys,
        'W3 Fisik': w3.act,
        'W3 Selisih': w3.var,
        'W4 Sistem': w4.sys,
        'W4 Fisik': w4.act,
        'W4 Selisih': w4.var,
        'Total Selisih Bulanan': hasAnyVar ? Math.round(totalVariance * 100) / 100 : '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Bulanan');
    XLSX.writeFile(wb, `Rekap_Bulanan_${outletName.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Week-to-Week Link Helpers */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Rekap Terhubung Bulanan (Week 1 — Week 4)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
              {outletName} • {periodLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Tabel rekap konsolidasi menghubungkan stok opname mingguan dari Minggu ke-1 hingga Minggu ke-4 dalam satu periode bulan utuh.
          </p>
        </div>

        {/* Link previous week actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              playClickSound();
              onLinkWeeks('week-1', 'week-2');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            title="Salin hasil stok fisik Week 1 menjadi stok sistem awal Week 2"
          >
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tautkan W1 &rarr; W2</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              onLinkWeeks('week-2', 'week-3');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            title="Salin hasil stok fisik Week 2 menjadi stok sistem awal Week 3"
          >
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tautkan W2 &rarr; W3</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              onLinkWeeks('week-3', 'week-4');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            title="Salin hasil stok fisik Week 3 menjadi stok sistem awal Week 4"
          >
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tautkan W3 &rarr; W4</span>
          </button>

          <button
            onClick={handleExportMonthly}
            disabled={consolidatedList.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/40 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Rekap Bulanan (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Week Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {(['week-1', 'week-2', 'week-3', 'week-4'] as const).map((wId, i) => {
          const w = weeks[wId];
          const hasData = w.items.length > 0;
          const counted = w.items.filter(
            (it) => it.qtyActual !== '' && it.qtyActual !== null && it.qtyActual !== undefined
          ).length;

          return (
            <div
              key={wId}
              onClick={() => onSwitchToWeek(wId)}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 p-4 rounded-xl shadow-lg cursor-pointer transition-all hover:bg-slate-800/40 space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                  {w.weekLabel}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    hasData
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {hasData ? `${w.items.length} Item` : 'Belum Ada'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {w.uploadedAt || 'Belum diunggah'}
              </p>
              {hasData && (
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-slate-800">
                  <span>Dihitung:</span>
                  <span className="font-mono text-cyan-400 font-bold">{counted} / {w.items.length}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari barang di rekap bulanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Warehouse:</span>
          {(['all', 'bar', 'kitchen', 'service'] as const).map((wh) => (
            <button
              key={wh}
              onClick={() => setWarehouseFilter(wh)}
              className={`px-3 py-1 rounded-lg capitalize font-medium ${
                warehouseFilter === wh
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {wh === 'all' ? 'Semua' : wh}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Consolidated Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">Nama Barang</th>
                <th className="py-3 px-3">Whs</th>
                <th className="py-3 px-3 font-mono">UOM</th>
                {/* Week 1 */}
                <th className="py-3 px-3 font-mono text-center bg-slate-950/40">
                  Week 1 (Sys/Act/Var)
                </th>
                {/* Week 2 */}
                <th className="py-3 px-3 font-mono text-center bg-slate-900/60">
                  Week 2 (Sys/Act/Var)
                </th>
                {/* Week 3 */}
                <th className="py-3 px-3 font-mono text-center bg-slate-950/40">
                  Week 3 (Sys/Act/Var)
                </th>
                {/* Week 4 */}
                <th className="py-3 px-3 font-mono text-center bg-slate-900/60">
                  Week 4 (Sys/Act/Var)
                </th>
                {/* Total Selisih Sebulan */}
                <th className="py-3 px-4 font-mono text-right font-bold">
                  Akumulasi Selisih
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {consolidatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    Belum ada data barang pada minggu manapun di bulan {periodLabel} untuk {outletName}.
                  </td>
                </tr>
              ) : (
                consolidatedList.map((row, idx) => {
                  const renderWeekPill = (wItem?: StockItem) => {
                    if (!wItem) {
                      return <span className="text-slate-600 font-mono">-</span>;
                    }
                    const hasAct = wItem.qtyActual !== '' && wItem.qtyActual !== null && wItem.qtyActual !== undefined;
                    const diff = hasAct ? Math.round((Number(wItem.qtyActual) - wItem.qty) * 100) / 100 : null;

                    return (
                      <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                        <span className="text-slate-400">{wItem.qty}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-white font-bold">{hasAct ? wItem.qtyActual : '...'}</span>
                        <span className="text-slate-600">/</span>
                        {diff === null ? (
                          <span className="text-slate-500">-</span>
                        ) : diff === 0 ? (
                          <span className="text-emerald-400 font-bold">0</span>
                        ) : diff < 0 ? (
                          <span className="text-rose-400 font-bold">{diff}</span>
                        ) : (
                          <span className="text-cyan-400 font-bold">+{diff}</span>
                        )}
                      </div>
                    );
                  };

                  let totalDiff = 0;
                  let hasDiff = false;
                  [row.w1, row.w2, row.w3, row.w4].forEach((w) => {
                    if (w && w.qtyActual !== '' && w.qtyActual !== null && w.qtyActual !== undefined) {
                      totalDiff += Number(w.qtyActual) - w.qty;
                      hasDiff = true;
                    }
                  });

                  totalDiff = Math.round(totalDiff * 100) / 100;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {row.namaBarang}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-slate-400">
                        {row.warehouse}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-300 font-bold text-[11px]">
                        {row.uom}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-950/30">
                        {renderWeekPill(row.w1)}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-900/30">
                        {renderWeekPill(row.w2)}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-950/30">
                        {renderWeekPill(row.w3)}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-900/30">
                        {renderWeekPill(row.w4)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right font-bold">
                        {!hasDiff ? (
                          <span className="text-slate-600">-</span>
                        ) : totalDiff === 0 ? (
                          <span className="text-emerald-400">0.00 (Sesuai)</span>
                        ) : totalDiff < 0 ? (
                          <span className="text-rose-400">{totalDiff} ({row.uom})</span>
                        ) : (
                          <span className="text-cyan-400">+{totalDiff} ({row.uom})</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
