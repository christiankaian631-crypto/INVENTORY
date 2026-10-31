/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { StockItem } from '../types/inventory';
import { parseExcelFile, downloadTemplateExcel } from '../utils/excelHelper';
import { playSuccessChime, playAlertChime, playClickSound } from '../utils/audio';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Layers,
} from 'lucide-react';

interface ExcelUploaderProps {
  onImportItems: (newItems: StockItem[], mode: 'replace' | 'append') => void;
  onClose?: () => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({
  onImportItems,
  onClose,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<StockItem[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const items = await parseExcelFile(file);
      if (items.length === 0) {
        setErrorMsg('File terbaca, namun tidak ditemukan baris data barang yang valid. Pastikan kolom "Nama Barang" terisi.');
        playAlertChime();
      } else {
        setParsedPreview(items);
        setFileName(file.name);
        playSuccessChime();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Gagal membaca file: ${err.message || 'Format tidak didukung atau file rusak.'}`);
      playAlertChime();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = (mode: 'replace' | 'append') => {
    if (!parsedPreview) return;
    playSuccessChime();
    onImportItems(parsedPreview, mode);
    if (onClose) onClose();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Upload File Excel / CSV</h3>
            <p className="text-xs text-slate-400">
              Impor data barang, gudang (*bar, kitchen, service*), kuantitas, dan satuan langsung ke tabel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClickSound();
              downloadTemplateExcel();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            title="Download Template Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Download Template Excel</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Drag & Drop Zone */}
      {!parsedPreview ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-950/20'
              : 'border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <UploadCloud className="w-7 h-7 text-emerald-400" />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              {isLoading ? 'Sedang membaca file...' : 'Tarik & Letakkan file Excel di sini, atau Klik untuk Memilih'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Mendukung format <strong>.xlsx</strong>, <strong>.xls</strong>, dan <strong>.csv</strong>
            </p>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 font-mono">
            Format Kolom yang Dikenali: Nama Barang | Warehouse (bar/kitchen/service) | Qty | UOM
          </div>

          {errorMsg && (
            <div className="mt-2 p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      ) : (
        /* Preview Before Confirming Import */
        <div className="space-y-4">
          <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">
                  Berhasil Membaca: <span className="font-mono text-emerald-300">{fileName}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Ditemukan <strong>{parsedPreview.length} item barang</strong> siap dimasukkan ke tabel inventaris.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setParsedPreview(null);
                setFileName('');
              }}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Ganti File
            </button>
          </div>

          {/* Quick Preview Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase sticky top-0">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Nama Barang</th>
                  <th className="py-2 px-3">Warehouse</th>
                  <th className="py-2 px-3 font-mono">Qty</th>
                  <th className="py-2 px-3">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {parsedPreview.slice(0, 5).map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-medium text-white">{it.namaBarang}</td>
                    <td className="py-2 px-3">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-300">
                        {it.warehouse}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono">{it.qty}</td>
                    <td className="py-2 px-3 text-slate-400">{it.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedPreview.length > 5 && (
            <p className="text-[11px] text-slate-500 italic text-center">
              ... dan {parsedPreview.length - 5} item lainnya.
            </p>
          )}

          {/* Import Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => handleConfirmImport('replace')}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all"
            >
              Ganti Semua Data ({parsedPreview.length} Item)
            </button>

            <button
              onClick={() => handleConfirmImport('append')}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Tambahkan ke Data yang Ada (+{parsedPreview.length} Item)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
