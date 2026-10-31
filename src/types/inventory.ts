/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WarehouseType = 'bar' | 'kitchen' | 'service' | string;

export interface StockItem {
  id: string;
  namaBarang: string;
  warehouse: WarehouseType;
  qty: number;
  uom: string;
  qtyActual: number | '';
  catatan?: string;
  updatedAt?: string;
}

export interface Outlet {
  id: string;
  name: string;
  isCustom?: boolean;
}

export type WeekId = 'week-1' | 'week-2' | 'week-3' | 'week-4';

export interface WeekData {
  weekId: WeekId;
  weekLabel: string;
  uploadedAt: string | null;
  fileName: string | null;
  items: StockItem[];
}

export interface OutletMonthData {
  outletId: string;
  period: string; // e.g. "2026-10"
  weeks: {
    'week-1': WeekData;
    'week-2': WeekData;
    'week-3': WeekData;
    'week-4': WeekData;
  };
  lastUpdated: string;
}

export const DEFAULT_OUTLETS: Outlet[] = [
  { id: 'sh-alsut', name: 'SH ALSUT' },
  { id: 'sh-the-barn', name: 'SH THE BARN' },
  { id: 'sh-smb', name: 'SH SMB' },
  { id: 'sh-bintaro', name: 'SH BINTARO' },
  { id: 'sh-kemang', name: 'SH KEMANG' },
  { id: 'sh-cipete', name: 'SH CIPETE' },
  { id: 'sh-lebak-bulus', name: 'SH LEBAK BULUS' },
];

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
