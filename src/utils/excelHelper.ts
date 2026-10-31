/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { StockItem, WarehouseType } from '../types/inventory';

/**
 * Normalizes warehouse input string to standard types ('bar', 'kitchen', 'service')
 */
export function normalizeWarehouse(val: any): WarehouseType {
  if (!val) return 'kitchen';
  const str = String(val).toLowerCase().trim();
  if (str.includes('bar')) return 'bar';
  if (str.includes('kitchen') || str.includes('dapur')) return 'kitchen';
  if (str.includes('service') || str.includes('servis') || str.includes('waiter') || str.includes('floor')) return 'service';
  return str;
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file into StockItem[]
 */
export async function parseExcelFile(file: File): Promise<StockItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const items: StockItem[] = [];

  rawRows.forEach((row, idx) => {
    // Find keys flexibly regardless of case or slight spacing
    let namaBarang = '';
    let warehouse: WarehouseType = 'kitchen';
    let qty = 0;
    let uom = 'Pcs';
    let qtyActual: number | '' = '';

    for (const key of Object.keys(row)) {
      const cleanKey = key.toLowerCase().trim().replace(/_/g, ' ');
      const val = row[key];

      if (
        cleanKey.includes('nama') ||
        cleanKey.includes('barang') ||
        cleanKey.includes('item') ||
        cleanKey.includes('product') ||
        cleanKey.includes('deskripsi')
      ) {
        namaBarang = String(val).trim();
      } else if (
        cleanKey.includes('warehouse') ||
        cleanKey.includes('gudang') ||
        cleanKey.includes('lokasi') ||
        cleanKey.includes('dept') ||
        cleanKey.includes('section')
      ) {
        warehouse = normalizeWarehouse(val);
      } else if (
        cleanKey === 'qty actual' ||
        cleanKey === 'actual' ||
        cleanKey === 'qty fisik' ||
        cleanKey === 'fisik' ||
        cleanKey === 'real'
      ) {
        if (val !== '' && !isNaN(Number(val))) {
          qtyActual = Number(val);
        }
      } else if (
        cleanKey === 'qty' ||
        cleanKey.includes('quantity') ||
        cleanKey.includes('jumlah') ||
        cleanKey.includes('stok') ||
        cleanKey.includes('book') ||
        cleanKey.includes('sistem')
      ) {
        const num = parseFloat(String(val).replace(/,/g, ''));
        qty = isNaN(num) ? 0 : num;
      } else if (
        cleanKey === 'uom' ||
        cleanKey.includes('satuan') ||
        cleanKey.includes('unit') ||
        cleanKey.includes('kemasan') ||
        cleanKey.includes('packaging') ||
        cleanKey.includes('measure') ||
        cleanKey.includes('ukuran') ||
        cleanKey.includes('uom')
      ) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          uom = String(val).trim();
        }
      }
    }

    // Only add if there is a valid item name
    if (namaBarang) {
      items.push({
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        namaBarang,
        warehouse,
        qty,
        uom: uom || 'Pcs',
        qtyActual,
      });
    }
  });

  return items;
}

/**
 * Downloads a sample template Excel (.xlsx) file
 */
export function downloadTemplateExcel() {
  const sampleData = [
    {
      'Nama Barang': 'Susu UHT Full Cream Diamond 1L',
      Warehouse: 'bar',
      Qty: 24,
      UOM: 'liter',
      'Qty Actual': '',
    },
    {
      'Nama Barang': 'Sirup Vanilla Monin 700ml',
      Warehouse: 'bar',
      Qty: 6,
      UOM: 'bottle',
      'Qty Actual': '',
    },
    {
      'Nama Barang': 'Daging Sapi Ribeye Meltique',
      Warehouse: 'kitchen',
      Qty: 18.5,
      UOM: 'kg',
      'Qty Actual': '',
    },
    {
      'Nama Barang': 'Beras Japonica / Risotto',
      Warehouse: 'kitchen',
      Qty: 50,
      UOM: 'kg',
      'Qty Actual': '',
    },
    {
      'Nama Barang': 'Bawang Bombay Merah',
      Warehouse: 'kitchen',
      Qty: 15,
      UOM: 'kg',
      'Qty Actual': '',
    },
    {
      'Nama Barang': 'Sedotan Kertas Biodegradable (100pcs)',
      Warehouse: 'service',
      Qty: 12,
      UOM: 'pack',
      'Qty Actual': '',
    },
    {
      'Nama Barang': 'Paper Napkin Cocktail 2-Ply',
      Warehouse: 'service',
      Qty: 30,
      UOM: 'pack',
      'Qty Actual': '',
    },
    {
      'Nama Barang': 'Toothpick Wrapped (500pcs)',
      Warehouse: 'service',
      Qty: 8,
      UOM: 'pack',
      'Qty Actual': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 38 }, // Nama Barang
    { wch: 16 }, // Warehouse
    { wch: 12 }, // Qty
    { wch: 12 }, // UOM
    { wch: 14 }, // Qty Actual
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Stok');
  XLSX.writeFile(wb, 'Template_Stock_Opname_Inventory.xlsx');
}

/**
 * Exports current items including Qty Actual and Qty Variance to Excel (.xlsx)
 */
export function exportToExcel(items: StockItem[], filename = 'Laporan_Stock_Opname.xlsx') {
  const exportData = items.map((it, idx) => {
    const hasActual = it.qtyActual !== '' && it.qtyActual !== null && it.qtyActual !== undefined;
    const actualNum = hasActual ? Number(it.qtyActual) : null;
    const variance = hasActual ? (actualNum! - it.qty) : null;

    let statusText = 'Belum Dihitung';
    if (hasActual) {
      if (variance === 0) statusText = 'Sesuai (Match)';
      else if (variance! < 0) statusText = `Selisih Kurang (${variance})`;
      else statusText = `Selisih Lebih (+${variance})`;
    }

    return {
      No: idx + 1,
      'Nama Barang': it.namaBarang,
      Warehouse: it.warehouse.toUpperCase(),
      'Qty Sistem': it.qty,
      UOM: it.uom,
      'Qty Actual (Fisik)': hasActual ? actualNum : '',
      'Qty Variance': hasActual ? variance : '',
      'Status Selisih': statusText,
      Catatan: it.catatan || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 38 }, // Nama Barang
    { wch: 15 }, // Warehouse
    { wch: 12 }, // Qty Sistem
    { wch: 10 }, // UOM
    { wch: 18 }, // Qty Actual
    { wch: 14 }, // Qty Variance
    { wch: 22 }, // Status Selisih
    { wch: 25 }, // Catatan
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hasil Opname');
  XLSX.writeFile(wb, filename);
}
