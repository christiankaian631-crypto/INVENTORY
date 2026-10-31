/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Outlet, WeekId, MONTH_NAMES_ID } from '../types/inventory';
import { playClickSound, playSuccessChime, playAlertChime } from '../utils/audio';
import {
  Building2,
  Calendar,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Layers,
  CalendarRange,
  X,
} from 'lucide-react';

interface OutletPeriodSelectorProps {
  outlets: Outlet[];
  selectedOutletId: string;
  onSelectOutlet: (outletId: string) => void;
  onAddOutlet: (name: string) => void;
  onDeleteOutlet: (id: string) => void;

  selectedYear: number;
  selectedMonthIndex: number; // 0-11
  onChangeMonth: (year: number, monthIndex: number) => void;

  selectedWeekId: WeekId | 'monthly-rekap';
  onSelectWeek: (weekId: WeekId | 'monthly-rekap') => void;
  weeksInfo: Record<WeekId, { itemsCount: number; uploadedAt: string | null }>;
}

export const OutletPeriodSelector: React.FC<OutletPeriodSelectorProps> = ({
  outlets,
  selectedOutletId,
  onSelectOutlet,
  onAddOutlet,
  onDeleteOutlet,
  selectedYear,
  selectedMonthIndex,
  onChangeMonth,
  selectedWeekId,
  onSelectWeek,
  weeksInfo,
}) => {
  const [showAddOutletModal, setShowAddOutletModal] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');

  const currentMonthLabel = `${MONTH_NAMES_ID[selectedMonthIndex]} ${selectedYear}`;

  const handlePrevMonth = () => {
    playClickSound();
    if (selectedMonthIndex === 0) {
      onChangeMonth(selectedYear - 1, 11);
    } else {
      onChangeMonth(selectedYear, selectedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    playClickSound();
    if (selectedMonthIndex === 11) {
      onChangeMonth(selectedYear + 1, 0);
    } else {
      onChangeMonth(selectedYear, selectedMonthIndex + 1);
    }
  };

  const handleCreateOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName.trim()) return;
    playSuccessChime();
    onAddOutlet(newOutletName.trim());
    setNewOutletName('');
    setShowAddOutletModal(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* 1. Month Selector & Outlet Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        {/* Month Selector Button Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-400" />
            Periode Bulan:
          </span>

          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1 shadow-inner">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-bold font-mono text-amber-300 min-w-[130px] text-center">
              {currentMonthLabel}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Multi-User Sync Status Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[11px] text-emerald-400 font-semibold">
            TERHUBUNG LIVE KE SEMUA USER
          </span>
          <span className="text-slate-500">• Data Per-Outlet Terisolasi Mandiri</span>
        </div>
      </div>

      {/* 2. Outlet Buttons Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-cyan-400" />
            Pilih Outlet Restoran ({outlets.length} Lokasi):
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {outlets.map((outlet) => {
            const isSelected = selectedOutletId === outlet.id;

            return (
              <div key={outlet.id} className="relative group">
                <button
                  onClick={() => {
                    playClickSound();
                    onSelectOutlet(outlet.id);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/40 scale-105'
                      : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/80'
                  }`}
                >
                  {outlet.name}
                </button>

                {/* Option to delete custom outlet */}
                {outlet.isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Hapus outlet custom "${outlet.name}"?`)) {
                        playAlertChime();
                        onDeleteOutlet(outlet.id);
                      }
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus outlet"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* Button Tambah Outlet Tambahan */}
          <button
            onClick={() => {
              playClickSound();
              setShowAddOutletModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Outlet</span>
          </button>
        </div>
      </div>

      {/* 3. Inventory Week Buttons: WEEK 1, WEEK 2, WEEK 3, WEEK 4 + Rekap Bulanan */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-emerald-400" />
          Pilihan Minggu Inventory (Sesuai Tanggal Upload & Saling Terhubung):
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { id: 'week-1' as const, label: 'WEEK 1' },
            { id: 'week-2' as const, label: 'WEEK 2' },
            { id: 'week-3' as const, label: 'WEEK 3' },
            { id: 'week-4' as const, label: 'WEEK 4' },
            { id: 'monthly-rekap' as const, label: 'REKAP 1 BULAN (W1 - W4)', isRekap: true },
          ].map((wk) => {
            const isSelected = selectedWeekId === wk.id;
            const info = !wk.isRekap ? weeksInfo[wk.id as WeekId] : null;

            return (
              <button
                key={wk.id}
                onClick={() => {
                  playClickSound();
                  onSelectWeek(wk.id);
                }}
                className={`p-3 rounded-xl text-left border transition-all ${
                  isSelected
                    ? wk.isRekap
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-lg'
                      : 'bg-amber-500/20 text-amber-200 border-amber-500/80 shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs">{wk.label}</span>
                  {info && info.itemsCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                      {info.itemsCount} Item
                    </span>
                  )}
                  {wk.isRekap && (
                    <CalendarRange className="w-3.5 h-3.5 text-emerald-300" />
                  )}
                </div>

                {info ? (
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    {info.uploadedAt ? (
                      <span className="text-emerald-300 font-mono">
                        {info.uploadedAt.replace('Ditautkan dari', 'Link:')}
                      </span>
                    ) : (
                      'Belum ada file diupload'
                    )}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-300 mt-1">
                    Semua minggu terhubung
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal Tambah Outlet Tambahan */}
      {showAddOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Tambah Outlet Baru</h3>
              </div>
              <button
                onClick={() => setShowAddOutletModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOutlet} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Nama Outlet (Contoh: SH PIK, SH SENOPATI):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SH PIK"
                  value={newOutletName}
                  onChange={(e) => setNewOutletName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold uppercase text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOutletModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg"
                >
                  Simpan Outlet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
