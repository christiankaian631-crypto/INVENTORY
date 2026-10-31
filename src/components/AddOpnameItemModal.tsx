/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StockItem, WarehouseType } from '../types/inventory';
import { playClickSound, playSuccessChime } from '../utils/audio';
import { Plus, X, Package } from 'lucide-react';

interface AddOpnameItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: StockItem) => void;
}

export const AddOpnameItemModal: React.FC<AddOpnameItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [namaBarang, setNamaBarang] = useState('');
  const [warehouse, setWarehouse] = useState<WarehouseType>('kitchen');
  const [qty, setQty] = useState<number>(10);
  const [uom, setUom] = useState('Pcs');
  const [qtyActual, setQtyActual] = useState<number | ''>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBarang.trim()) return;

    playSuccessChime();

    const newItem: StockItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      namaBarang: namaBarang.trim(),
      warehouse,
      qty,
      uom,
      qtyActual: qtyActual === '' ? '' : Number(qtyActual),
    };

    onAddItem(newItem);
    setNamaBarang('');
    setQty(10);
    setQtyActual('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Tambah Barang Inventaris</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Nama Barang *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Sirup Hazelnut / Daging Tenderloin"
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Warehouse *</label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value as WarehouseType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="bar">Bar</option>
                <option value="kitchen">Kitchen</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Satuan / UOM *</label>
              <input
                list="uom-modal-options"
                type="text"
                required
                placeholder="Pcs, pack, liter, dus, dll"
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
              />
              <datalist id="uom-modal-options">
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
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Qty (Sistem / Buku) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={qty}
                onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Qty Actual (Fisik - Opsional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Bisa diisi nanti"
                value={qtyActual === '' ? '' : qtyActual}
                onChange={(e) => setQtyActual(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-950/40"
            >
              Simpan Barang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
