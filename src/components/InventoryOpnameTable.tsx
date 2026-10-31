/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StockItem, WarehouseType } from '../types/inventory';
import { playClickSound, playAlertChime, playSuccessChime } from '../utils/audio';
import { exportToExcel } from '../utils/excelHelper';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  HelpCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface InventoryOpnameTableProps {
  items: StockItem[];
  onUpdateItemActual: (id: string, actualVal: number | '') => void;
  onUpdateItemField: (id: string, field: keyof StockItem, value: any) => void;
  onDeleteItem: (id: string) => void;
  onOpenAddModal: () => void;
  onFillAllAsMatch: () => void;
  onClearAllActuals: () => void;
}

export const InventoryOpnameTable: React.FC<InventoryOpnameTableProps> = ({
  items,
  onUpdateItemActual,
  onUpdateItemField,
  onDeleteItem,
  onOpenAddModal,
  onFillAllAsMatch,
  onClearAllActuals,
}) => {
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'variance' | 'match' | 'uncounted'>('all');

  // Filter items
  const filtered = items.filter((it) => {
    const matchesSearch = it.namaBarang.toLowerCase().includes(search.toLowerCase());
    const matchesWarehouse = warehouseFilter === 'all' || it.warehouse.toLowerCase() === warehouseFilter.toLowerCase();

    const hasActual = it.qtyActual !== '' && it.qtyActual !== null && it.qtyActual !== undefined;
    const variance = hasActual ? Number(it.qtyActual) - it.qty : null;

    let matchesStatus = true;
    if (statusFilter === 'uncounted') {
      matchesStatus = !hasActual;
    } else if (statusFilter === 'match') {
      matchesStatus = hasActual && variance === 0;
    } else if (statusFilter === 'variance') {
      matchesStatus = hasActual && variance !== 0;
    }

    return matchesSearch && matchesWarehouse && matchesStatus;
  });

  const getWarehouseBadge = (w: WarehouseType) => {
    const norm = String(w).toLowerCase();
    if (norm === 'bar') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          BAR
        </span>
      );
    }
    if (norm === 'kitchen') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          KITCHEN
        </span>
      );
    }
    if (norm === 'service') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          SERVICE
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
        {w}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search, Filters, and Table Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                playClickSound();
                onOpenAddModal();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-950/40 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Barang</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                exportToExcel(items, `Laporan_Stock_Opname_${new Date().toISOString().slice(0, 10)}.xlsx`);
              }}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          {/* Warehouse Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Warehouse:</span>
            {(['all', 'bar', 'kitchen', 'service'] as const).map((wh) => (
              <button
                key={wh}
                onClick={() => {
                  playClickSound();
                  setWarehouseFilter(wh);
                }}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                  warehouseFilter === wh
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {wh === 'all' ? 'Semua' : wh}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Status Selisih Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status Selisih:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Status</option>
              <option value="variance">Ada Selisih (Kurang / Lebih)</option>
              <option value="match">Sesuai / Cocok (Variance = 0)</option>
              <option value="uncounted">Belum Diisi Actual</option>
            </select>
          </div>

          {/* Table Helpers */}
          {items.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={onFillAllAsMatch}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                title="Isi otomatis Qty Actual sama dengan Qty Sistem untuk mempermudah audit"
              >
                Isi Semua Sesuai Qty Buku
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={onClearAllActuals}
                className="text-[11px] text-slate-500 hover:text-rose-400 underline"
              >
                Kosongkan Qty Actual
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Opname Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Nama Barang</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4 font-mono text-center">Qty (Sistem)</th>
                <th className="py-3 px-4">UOM</th>
                <th className="py-3 px-4 font-mono text-center min-w-[160px]">
                  Qty Actual (Manual)
                </th>
                <th className="py-3 px-4 font-mono text-center min-w-[150px]">
                  Qty Variance
                </th>
                <th className="py-3 px-4 text-right w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    {items.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-sm font-semibold text-slate-300">
                          Data barang masih kosong.
                        </p>
                        <p className="text-xs text-slate-500">
                          Silakan upload file Excel/CSV di atas atau tekan tombol "+ Tambah Barang" untuk mulai mengisi data inventaris.
                        </p>
                      </div>
                    ) : (
                      'Tidak ada barang yang cocok dengan filter pencarian.'
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const hasActual = item.qtyActual !== '' && item.qtyActual !== null && item.qtyActual !== undefined;
                  const actualNum = hasActual ? Number(item.qtyActual) : null;
                  const variance = hasActual ? Math.round((actualNum! - item.qty) * 100) / 100 : null;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        hasActual && variance !== 0
                          ? variance! < 0
                            ? 'bg-rose-950/15'
                            : 'bg-emerald-950/15'
                          : ''
                      }`}
                    >
                      {/* # Index */}
                      <td className="py-3 px-4 text-center font-mono text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Nama Barang */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={item.namaBarang}
                          onChange={(e) => onUpdateItemField(item.id, 'namaBarang', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:bg-slate-950 px-1.5 py-1 text-white font-semibold focus:outline-none rounded transition-colors text-xs"
                        />
                      </td>

                      {/* Warehouse (bar, kitchen, service) */}
                      <td className="py-3 px-4">
                        <select
                          value={item.warehouse}
                          onChange={(e) => onUpdateItemField(item.id, 'warehouse', e.target.value)}
                          className="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="bar">Bar</option>
                          <option value="kitchen">Kitchen</option>
                          <option value="service">Service</option>
                        </select>
                      </td>

                      {/* Qty Sistem */}
                      <td className="py-3 px-4 font-mono text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) =>
                            onUpdateItemField(item.id, 'qty', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 text-center bg-slate-950/70 border border-slate-700 rounded-lg py-1 px-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      {/* UOM (Auto sesuai data Excel) */}
                      <td className="py-3 px-4">
                        <input
                          list="uom-datalist-options"
                          type="text"
                          value={item.uom}
                          onChange={(e) => onUpdateItemField(item.id, 'uom', e.target.value)}
                          placeholder="Satuan"
                          className="w-24 text-center bg-slate-950/80 border border-slate-700/80 hover:border-slate-500 focus:border-amber-500 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:bg-slate-900 transition-colors"
                          title="UOM otomatis sesuai data Excel yang di-upload (dapat diedit jika perlu)"
                        />
                      </td>

                      {/* Qty Actual (di isi manual) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Isi fisik..."
                            value={item.qtyActual === '' ? '' : item.qtyActual}
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateItemActual(item.id, val === '' ? '' : parseFloat(val));
                            }}
                            className={`w-28 text-center py-1.5 px-2 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:ring-1 ${
                              !hasActual
                                ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600 focus:ring-amber-500'
                                : variance === 0
                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 focus:ring-emerald-500'
                                : variance! < 0
                                ? 'bg-rose-950/40 border-rose-500 text-rose-300 focus:ring-rose-500'
                                : 'bg-cyan-950/40 border-cyan-500 text-cyan-300 focus:ring-cyan-500'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Qty Variance (Qty Actual - Qty) */}
                      <td className="py-3 px-4 font-mono text-center">
                        {!hasActual ? (
                          <span className="text-[11px] text-slate-500 italic">
                            Belum diisi
                          </span>
                        ) : variance === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>0.00 (Sesuai)</span>
                          </span>
                        ) : variance! < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            <TrendingDown className="w-3 h-3" />
                            <span>{variance} (Kurang)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{variance} (Lebih)</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            playAlertChime();
                            onDeleteItem(item.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Hapus baris barang ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Datalist for flexible UOM auto-suggestions */}
      <datalist id="uom-datalist-options">
        <option value="Pcs" />
        <option value="pack" />
        <option value="liter" />
        <option value="ml" />
        <option value="kg" />
        <option value="gr" />
        <option value="bottle" />
        <option value="can" />
        <option value="box" />
        <option value="dus" />
        <option value="karton" />
        <option value="ikat" />
        <option value="butir" />
        <option value="porsi" />
        <option value="roll" />
        <option value="tin" />
      </datalist>
    </div>
  );
};
