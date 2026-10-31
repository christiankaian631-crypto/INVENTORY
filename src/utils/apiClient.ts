/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet, DEFAULT_OUTLETS, OutletMonthData, WeekData, WeekId } from '../types/inventory';

const STORAGE_OUTLETS_KEY = 'restaurant_outlets_list';
const STORAGE_DATA_PREFIX = 'restaurant_opname_';

/**
 * Loads outlets from backend /api/outlets with local storage fallback
 */
export async function getOutlets(): Promise<Outlet[]> {
  try {
    const res = await fetch('/api/outlets');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/outlets unreachable, using local storage cache', err);
  }

  // Fallback to local storage or defaults
  try {
    const cached = localStorage.getItem(STORAGE_OUTLETS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return DEFAULT_OUTLETS;
}

/**
 * Adds a new outlet via backend API or local storage
 */
export async function addOutlet(name: string): Promise<Outlet> {
  const trimmed = name.trim().toUpperCase();
  try {
    const res = await fetch('/api/outlets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend error adding outlet, using local storage fallback', err);
  }

  const id = `sh-${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
  const newOutlet: Outlet = { id, name: trimmed, isCustom: true };

  try {
    const current = await getOutlets();
    const updated = [...current, newOutlet];
    localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(updated));
  } catch {}

  return newOutlet;
}

/**
 * Deletes a custom outlet
 */
export async function deleteOutlet(id: string): Promise<void> {
  try {
    await fetch(`/api/outlets/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {}

  try {
    const current = await getOutlets();
    const updated = current.filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Fetches an outlet's month data (containing Week 1 to Week 4)
 */
export async function getOutletMonthData(outletId: string, period: string): Promise<OutletMonthData> {
  const cacheKey = `${STORAGE_DATA_PREFIX}${outletId}_${period}`;

  try {
    const res = await fetch(`/api/inventory?outletId=${encodeURIComponent(outletId)}&period=${encodeURIComponent(period)}`);
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Backend /api/inventory unreachable, reading from local cache', err);
  }

  // Fallback to local storage or blank month
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  return {
    outletId,
    period,
    weeks: {
      'week-1': { weekId: 'week-1', weekLabel: 'Week 1', uploadedAt: null, fileName: null, items: [] },
      'week-2': { weekId: 'week-2', weekLabel: 'Week 2', uploadedAt: null, fileName: null, items: [] },
      'week-3': { weekId: 'week-3', weekLabel: 'Week 3', uploadedAt: null, fileName: null, items: [] },
      'week-4': { weekId: 'week-4', weekLabel: 'Week 4', uploadedAt: null, fileName: null, items: [] },
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Saves a week's inventory data to backend & local storage
 */
export async function saveWeekData(
  outletId: string,
  period: string,
  weekId: WeekId,
  weekData: WeekData
): Promise<void> {
  const cacheKey = `${STORAGE_DATA_PREFIX}${outletId}_${period}`;

  // Update local cache immediately
  try {
    const cached = localStorage.getItem(cacheKey);
    let monthObj: OutletMonthData;
    if (cached) {
      monthObj = JSON.parse(cached);
    } else {
      monthObj = {
        outletId,
        period,
        weeks: {
          'week-1': { weekId: 'week-1', weekLabel: 'Week 1', uploadedAt: null, fileName: null, items: [] },
          'week-2': { weekId: 'week-2', weekLabel: 'Week 2', uploadedAt: null, fileName: null, items: [] },
          'week-3': { weekId: 'week-3', weekLabel: 'Week 3', uploadedAt: null, fileName: null, items: [] },
          'week-4': { weekId: 'week-4', weekLabel: 'Week 4', uploadedAt: null, fileName: null, items: [] },
        },
        lastUpdated: new Date().toISOString(),
      };
    }
    monthObj.weeks[weekId] = weekData;
    monthObj.lastUpdated = new Date().toISOString();
    localStorage.setItem(cacheKey, JSON.stringify(monthObj));
  } catch {}

  // Post to backend
  try {
    await fetch('/api/inventory/save-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outletId, period, weekId, weekData }),
    });
  } catch (err) {
    console.warn('Backend sync failed, saved locally', err);
  }
}

/**
 * Links and carries over previous week's actual counts as current week's opening stock
 */
export async function linkPreviousWeekData(
  outletId: string,
  period: string,
  currentWeekId: WeekId,
  previousWeekId: WeekId
): Promise<OutletMonthData | null> {
  try {
    const res = await fetch('/api/inventory/link-previous-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outletId, period, currentWeekId, previousWeekId }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.record;
    }
  } catch {}

  return null;
}

/**
 * Clears week data
 */
export async function clearWeekData(
  outletId: string,
  period: string,
  weekId: WeekId
): Promise<void> {
  try {
    await fetch('/api/inventory/clear-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outletId, period, weekId }),
    });
  } catch {}

  const cacheKey = `${STORAGE_DATA_PREFIX}${outletId}_${period}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const obj = JSON.parse(cached);
      if (obj.weeks && obj.weeks[weekId]) {
        obj.weeks[weekId] = {
          weekId,
          weekLabel: obj.weeks[weekId].weekLabel,
          uploadedAt: null,
          fileName: null,
          items: [],
        };
        localStorage.setItem(cacheKey, JSON.stringify(obj));
      }
    }
  } catch {}
}
