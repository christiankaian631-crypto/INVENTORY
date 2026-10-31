/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Outlet,
  DEFAULT_OUTLETS,
  WeekId,
  StockItem,
  OutletMonthData,
  MONTH_NAMES_ID,
} from './types/inventory';
import { Header } from './components/Header';
import { OutletPeriodSelector } from './components/OutletPeriodSelector';
import { ExcelUploader } from './components/ExcelUploader';
import { InventoryOpnameTable } from './components/InventoryOpnameTable';
import { MonthlyRekapView } from './components/MonthlyRekapView';
import { AddOpnameItemModal } from './components/AddOpnameItemModal';
import { downloadTemplateExcel, exportToExcel } from './utils/excelHelper';
import {
  getOutlets,
  addOutlet,
  deleteOutlet,
  getOutletMonthData,
  saveWeekData,
  linkPreviousWeekData,
  clearWeekData,
} from './utils/apiClient';
import {
  setSoundMuted,
  playAlertChime,
  playSuccessChime,
  playClickSound,
} from './utils/audio';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Download,
  Plus,
  Trash2,
  Sparkles,
  Link2,
  RotateCcw,
} from 'lucide-react';

export default function App() {
  // Outlets list (default + custom)
  const [outlets, setOutlets] = useState<Outlet[]>(DEFAULT_OUTLETS);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('sh-alsut');

  // Month Period: default to October 2026 (or current)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(9); // 0-indexed: 9 = Oktober

  // Selected Week or Monthly Rekap
  const [selectedWeekId, setSelectedWeekId] = useState<WeekId | 'monthly-rekap'>('week-1');

  // Month data for current outlet and period
  const [monthData, setMonthData] = useState<OutletMonthData>({
    outletId: 'sh-alsut',
    period: '2026-10',
    weeks: {
      'week-1': { weekId: 'week-1', weekLabel: 'Week 1', uploadedAt: null, fileName: null, items: [] },
      'week-2': { weekId: 'week-2', weekLabel: 'Week 2', uploadedAt: null, fileName: null, items: [] },
      'week-3': { weekId: 'week-3', weekLabel: 'Week 3', uploadedAt: null, fileName: null, items: [] },
      'week-4': { weekId: 'week-4', weekLabel: 'Week 4', uploadedAt: null, fileName: null, items: [] },
    },
    lastUpdated: new Date().toISOString(),
  });

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [soundMuted, setMutedState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Period string "YYYY-MM"
  const periodString = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;
  const periodLabel = `${MONTH_NAMES_ID[selectedMonthIndex]} ${selectedYear}`;

  // Current outlet object
  const currentOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0] || DEFAULT_OUTLETS[0];

  // Load Outlets on Mount
  useEffect(() => {
    getOutlets().then((loaded) => {
      if (loaded && loaded.length > 0) setOutlets(loaded);
    });
  }, []);

  // Fetch month data whenever outletId or period changes (Isolated Per Outlet)
  const loadCurrentMonthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getOutletMonthData(selectedOutletId, periodString);
      setMonthData(data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOutletId, periodString]);

  useEffect(() => {
    loadCurrentMonthData();
  }, [loadCurrentMonthData]);

  // Periodic multi-user sync: refreshes data in background every 15s to keep all users connected
  useEffect(() => {
    const timer = setInterval(() => {
      getOutletMonthData(selectedOutletId, periodString).then((latest) => {
        setMonthData(latest);
      });
    }, 15000);
    return () => clearInterval(timer);
  }, [selectedOutletId, periodString]);

  const handleToggleSound = () => {
    const nextMuted = !soundMuted;
    setMutedState(nextMuted);
    setSoundMuted(nextMuted);
  };

  // Current active week data
  const isRekap = selectedWeekId === 'monthly-rekap';
  const currentWeekData = !isRekap ? monthData.weeks[selectedWeekId as WeekId] : null;
  const currentItems = currentWeekData ? currentWeekData.items : [];

  // Summary Metrics for current week
  const totalItems = currentItems.length;
  const countedItems = currentItems.filter(
    (it) => it.qtyActual !== '' && it.qtyActual !== null && it.qtyActual !== undefined
  ).length;

  let matchCount = 0;
  let minusCount = 0;
  let plusCount = 0;

  currentItems.forEach((it) => {
    if (it.qtyActual !== '' && it.qtyActual !== null && it.qtyActual !== undefined) {
      const diff = Number(it.qtyActual) - it.qty;
      if (diff === 0) matchCount++;
      else if (diff < 0) minusCount++;
      else plusCount++;
    }
  });

  const varianceCount = minusCount + plusCount;

  // Weeks info for selector badges
  const weeksInfo: Record<WeekId, { itemsCount: number; uploadedAt: string | null }> = {
    'week-1': { itemsCount: monthData.weeks['week-1'].items.length, uploadedAt: monthData.weeks['week-1'].uploadedAt },
    'week-2': { itemsCount: monthData.weeks['week-2'].items.length, uploadedAt: monthData.weeks['week-2'].uploadedAt },
    'week-3': { itemsCount: monthData.weeks['week-3'].items.length, uploadedAt: monthData.weeks['week-3'].uploadedAt },
    'week-4': { itemsCount: monthData.weeks['week-4'].items.length, uploadedAt: monthData.weeks['week-4'].uploadedAt },
  };

  // Save current week items helper
  const updateCurrentWeekItems = (
    newItems: StockItem[],
    uploadedAt?: string | null,
    fileName?: string | null
  ) => {
    if (isRekap) return;
    const weekId = selectedWeekId as WeekId;

    const updatedWeek = {
      ...currentWeekData!,
      items: newItems,
      uploadedAt: uploadedAt !== undefined ? uploadedAt : currentWeekData!.uploadedAt,
      fileName: fileName !== undefined ? fileName : currentWeekData!.fileName,
    };

    setMonthData((prev) => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [weekId]: updatedWeek,
      },
      lastUpdated: new Date().toISOString(),
    }));

    saveWeekData(selectedOutletId, periodString, weekId, updatedWeek);
  };

  // Add Outlet
  const handleAddOutlet = async (name: string) => {
    const created = await addOutlet(name);
    setOutlets((prev) => [...prev, created]);
    setSelectedOutletId(created.id);
  };

  // Delete Outlet
  const handleDeleteOutlet = async (id: string) => {
    await deleteOutlet(id);
    setOutlets((prev) => prev.filter((o) => o.id !== id));
    if (selectedOutletId === id) {
      setSelectedOutletId('sh-alsut');
    }
  };

  // Change Month Period
  const handleChangeMonth = (year: number, monthIndex: number) => {
    setSelectedYear(year);
    setSelectedMonthIndex(monthIndex);
  };

  // Import from Excel for Current Week
  const handleImportItems = (newItems: StockItem[], mode: 'replace' | 'append') => {
    if (isRekap) return;
    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const itemsToSet = mode === 'replace' ? newItems : [...currentItems, ...newItems];
    updateCurrentWeekItems(itemsToSet, `Upload: ${nowStr}`);
    setIsUploadOpen(false);
  };

  // Update Qty Actual (diisi manual)
  const handleUpdateItemActual = (id: string, actualVal: number | '') => {
    const updated = currentItems.map((it) => (it.id === id ? { ...it, qtyActual: actualVal } : it));
    updateCurrentWeekItems(updated);
  };

  // Update generic field
  const handleUpdateItemField = (id: string, field: keyof StockItem, value: any) => {
    const updated = currentItems.map((it) => (it.id === id ? { ...it, [field]: value } : it));
    updateCurrentWeekItems(updated);
  };

  // Delete single item row
  const handleDeleteItem = (id: string) => {
    const updated = currentItems.filter((it) => it.id !== id);
    updateCurrentWeekItems(updated);
  };

  // Add item manually to current week
  const handleAddItem = (item: StockItem) => {
    const updated = [item, ...currentItems];
    updateCurrentWeekItems(updated);
  };

  // Clear current week
  const handleClearWeek = async () => {
    if (isRekap) return;
    const weekId = selectedWeekId as WeekId;
    if (confirm(`Kosongkan semua data barang untuk ${currentWeekData?.weekLabel} di ${currentOutlet.name}?`)) {
      playAlertChime();
      await clearWeekData(selectedOutletId, periodString, weekId);
      updateCurrentWeekItems([], null, null);
    }
  };

  // Fill all actuals as match
  const handleFillAllAsMatch = () => {
    playSuccessChime();
    const updated = currentItems.map((it) => ({ ...it, qtyActual: it.qty }));
    updateCurrentWeekItems(updated);
  };

  // Clear all actuals
  const handleClearAllActuals = () => {
    playClickSound();
    const updated = currentItems.map((it) => ({ ...it, qtyActual: '' as '' }));
    updateCurrentWeekItems(updated);
  };

  // Link previous week data: copies previous week's physical actual counts as current week's opening Qty
  const handleLinkPreviousWeek = async (
    fromWeek: 'week-1' | 'week-2' | 'week-3',
    toWeek: 'week-2' | 'week-3' | 'week-4'
  ) => {
    const prevWeek = monthData.weeks[fromWeek];
    if (prevWeek.items.length === 0) {
      alert(`Data pada ${prevWeek.weekLabel} masih kosong.`);
      return;
    }

    if (
      monthData.weeks[toWeek].items.length > 0 &&
      !confirm(`Data pada ${monthData.weeks[toWeek].weekLabel} sudah ada. Ganti dengan stok lanjutan dari ${prevWeek.weekLabel}?`)
    ) {
      return;
    }

    playSuccessChime();
    const updatedMonth = await linkPreviousWeekData(selectedOutletId, periodString, toWeek, fromWeek);
    if (updatedMonth) {
      setMonthData(updatedMonth);
    } else {
      // Local fallback
      const newItems = prevWeek.items.map((it) => {
        const carried = it.qtyActual !== '' && it.qtyActual !== null && it.qtyActual !== undefined
          ? Number(it.qtyActual)
          : it.qty;
        return {
          ...it,
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          qty: carried,
          qtyActual: '' as '',
        };
      });

      const updatedWeek = {
        ...monthData.weeks[toWeek],
        items: newItems,
        uploadedAt: `Ditautkan dari ${prevWeek.weekLabel} (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})`,
      };

      setMonthData((prev) => ({
        ...prev,
        weeks: {
          ...prev.weeks,
          [toWeek]: updatedWeek,
        },
      }));
      saveWeekData(selectedOutletId, periodString, toWeek, updatedWeek);
    }
  };

  // Get previous week helper for the current active week
  const getPreviousWeekId = (wkId: WeekId): WeekId | null => {
    if (wkId === 'week-2') return 'week-1';
    if (wkId === 'week-3') return 'week-2';
    if (wkId === 'week-4') return 'week-3';
    return null;
  };

  const prevWeekId = !isRekap ? getPreviousWeekId(selectedWeekId as WeekId) : null;
  const prevWeekHasItems = prevWeekId ? monthData.weeks[prevWeekId].items.length > 0 : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header */}
      <Header
        activeOutletName={currentOutlet.name}
        activeWeekLabel={!isRekap ? currentWeekData?.weekLabel || 'Week 1' : 'Rekap 1 Bulan'}
        totalItems={totalItems}
        countedItems={countedItems}
        varianceCount={varianceCount}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onDownloadTemplate={downloadTemplateExcel}
        onExportExcel={() =>
          exportToExcel(
            currentItems,
            `Stock_Opname_${currentOutlet.name.replace(/\s+/g, '_')}_${selectedWeekId}_${periodString}.xlsx`
          )
        }
        onClearAll={handleClearWeek}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. Outlet, Month Period & Week Selector Bar */}
        <OutletPeriodSelector
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          onSelectOutlet={(id) => {
            setSelectedOutletId(id);
            setIsUploadOpen(false);
          }}
          onAddOutlet={handleAddOutlet}
          onDeleteOutlet={handleDeleteOutlet}
          selectedYear={selectedYear}
          selectedMonthIndex={selectedMonthIndex}
          onChangeMonth={handleChangeMonth}
          selectedWeekId={selectedWeekId}
          onSelectWeek={(wId) => {
            setSelectedWeekId(wId);
            setIsUploadOpen(false);
          }}
          weeksInfo={weeksInfo}
        />

        {/* View Mode 1: Rekap 1 Bulan (Week 1 - Week 4 Terhubung Konsolidasi) */}
        {isRekap ? (
          <MonthlyRekapView
            monthData={monthData}
            outletName={currentOutlet.name}
            periodLabel={periodLabel}
            onLinkWeeks={(fromW, toW) => handleLinkPreviousWeek(fromW, toW)}
            onSwitchToWeek={(wId) => setSelectedWeekId(wId)}
          />
        ) : (
          /* View Mode 2: Individual Weekly Stock Opname (Week 1 / Week 2 / Week 3 / Week 4) */
          <div className="space-y-6">
            {/* KPI Summary Cards for Current Week */}
            {totalItems > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Barang ({currentWeekData?.weekLabel})
                  </span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {totalItems} <span className="text-xs font-normal text-slate-500">Item</span>
                  </div>
                  <p className="text-[11px] text-amber-400 mt-1 font-mono truncate">
                    {currentOutlet.name}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Sudah Dihitung (Actual)
                  </span>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                    {countedItems} <span className="text-xs font-normal text-slate-500">/ {totalItems}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all"
                      style={{ width: `${totalItems ? (countedItems / totalItems) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    Selisih Kurang (Minus)
                  </span>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                    {minusCount} <span className="text-xs font-normal text-slate-500">Item</span>
                  </div>
                  <p className="text-[11px] text-rose-400/80 mt-1">
                    Fisik &lt; Sistem
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Sesuai (Match)
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {matchCount} <span className="text-xs font-normal text-slate-500">Item</span>
                  </div>
                  <p className="text-[11px] text-emerald-400/80 mt-1">
                    Variance = 0.00
                  </p>
                </div>
              </div>
            )}

            {/* Link from Previous Week Prompt Banner (if current week is empty or week 2, 3, 4) */}
            {prevWeekId && prevWeekHasItems && (
              <div className="p-4 bg-slate-900/80 border border-cyan-800/50 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Link2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <strong className="text-white">Hubungkan dari {monthData.weeks[prevWeekId].weekLabel}:</strong>{' '}
                    <span className="text-slate-300">
                      Tersedia {monthData.weeks[prevWeekId].items.length} item dari minggu sebelumnya. Anda dapat menyalin hasil hitung fisik minggu lalu sebagai stok sistem awal minggu ini.
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleLinkPreviousWeek(
                      prevWeekId as 'week-1' | 'week-2' | 'week-3',
                      selectedWeekId as 'week-2' | 'week-3' | 'week-4'
                    )
                  }
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-950/40 flex items-center gap-1.5 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Tautkan dari {monthData.weeks[prevWeekId].weekLabel}</span>
                </button>
              </div>
            )}

            {/* Excel Uploader Drawer (Shown when requested or when current week is empty) */}
            {(isUploadOpen || totalItems === 0) && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 px-1">
                  <span>Upload Sheet untuk {currentOutlet.name} — {currentWeekData?.weekLabel} ({periodLabel})</span>
                </div>

                <ExcelUploader
                  onImportItems={handleImportItems}
                  onClose={totalItems > 0 ? () => setIsUploadOpen(false) : undefined}
                />
              </div>
            )}

            {/* Opname Table */}
            <InventoryOpnameTable
              items={currentItems}
              onUpdateItemActual={handleUpdateItemActual}
              onUpdateItemField={handleUpdateItemField}
              onDeleteItem={handleDeleteItem}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onFillAllAsMatch={handleFillAllAsMatch}
              onClearAllActuals={handleClearAllActuals}
            />
          </div>
        )}
      </main>

      {/* Add Single Item Modal */}
      <AddOpnameItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItem={handleAddItem}
      />
    </div>
  );
}
