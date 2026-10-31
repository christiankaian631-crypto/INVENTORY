/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Package,
  UploadCloud,
  Download,
  Plus,
  Trash2,
  FileSpreadsheet,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface HeaderProps {
  activeOutletName: string;
  activeWeekLabel: string;
  totalItems: number;
  countedItems: number;
  varianceCount: number;
  onOpenUpload: () => void;
  onOpenAddModal: () => void;
  onDownloadTemplate: () => void;
  onExportExcel: () => void;
  onClearAll: () => void;
  soundMuted: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeOutletName,
  activeWeekLabel,
  totalItems,
  countedItems,
  varianceCount,
  onOpenUpload,
  onOpenAddModal,
  onDownloadTemplate,
  onExportExcel,
  onClearAll,
  soundMuted,
  onToggleSound,
}) => {
  return (
    <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-950/50">
            <Package className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black tracking-wider text-white">
                INVENTORY
              </h1>
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/40">
                {activeOutletName}
              </span>
              <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                {activeWeekLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Audit Stok Multi-Warehouse: <span className="text-amber-400 font-medium">Bar</span> • <span className="text-emerald-400 font-medium">Kitchen</span> • <span className="text-blue-400 font-medium">Service</span>
            </p>
          </div>
        </div>

        {/* Global Stock Stats */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Total Barang:</span>
            <span className="font-mono font-bold text-white text-sm">
              {totalItems} Item
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Sudah Dihitung:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {countedItems} / {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Ada Selisih:</span>
            <span
              className={`font-mono font-bold text-sm ${
                varianceCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {varianceCount} Item
            </span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Excel Button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenUpload();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-950/40 transition-all"
            title="Upload data barang dari Excel (.xlsx, .csv)"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Excel</span>
          </button>

          {/* Download Template */}
          <button
            onClick={() => {
              playClickSound();
              onDownloadTemplate();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs border border-slate-700 transition-colors"
            title="Download template kosong Excel (.xlsx) siap isi"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Template Excel</span>
          </button>

          {/* Add Item Button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenAddModal();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-950/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang</span>
          </button>

          {/* Export Result */}
          {totalItems > 0 && (
            <button
              onClick={() => {
                playClickSound();
                onExportExcel();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              title="Download laporan hasil opname ke Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Hasil</span>
            </button>
          )}

          {/* Clear All Data */}
          {totalItems > 0 && (
            <button
              onClick={() => {
                playClickSound();
                onClearAll();
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-800 transition-colors"
              title="Kosongkan Semua Data Barang"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Mute Audio */}
          <button
            onClick={() => {
              playClickSound();
              onToggleSound();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={soundMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
