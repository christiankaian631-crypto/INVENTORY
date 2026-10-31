/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Outlet, DEFAULT_OUTLETS, OutletMonthData, WeekData, WeekId } from '../types/inventory';

const STORAGE_OUTLETS_KEY = 'restaurant_outlets_list';
const STORAGE_DATA_PREFIX = 'restaurant_opname_';

/**
 * Creates blank default month data structure
 */
export function createEmptyMonthData(outletId: string, period: string): OutletMonthData {
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
 * Subscribes to real-time outlets updates via Firestore across all users
 */
export function subscribeOutlets(onUpdate: (outlets: Outlet[]) => void): () => void {
  const outletsCol = collection(db, 'outlets');

  const unsubscribe = onSnapshot(
    outletsCol,
    async (snapshot) => {
      if (snapshot.empty) {
        // If Firestore outlets collection is empty, seed with DEFAULT_OUTLETS
        try {
          for (const item of DEFAULT_OUTLETS) {
            await setDoc(doc(db, 'outlets', item.id), item);
          }
        } catch {
          // Ignored if permissions restrict seeding
        }
        onUpdate(DEFAULT_OUTLETS);
        return;
      }

      const list: Outlet[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Outlet);
      });

      // Preserve default order or alphabetically
      if (list.length > 0) {
        localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(list));
        onUpdate(list);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'outlets');
      // Fallback to local storage or defaults on connection glitch
      getOutlets().then(onUpdate);
    }
  );

  return unsubscribe;
}

/**
 * Loads outlets from Firestore with local storage & API fallback
 */
export async function getOutlets(): Promise<Outlet[]> {
  try {
    const colRef = collection(db, 'outlets');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const list: Outlet[] = [];
      snapshot.forEach((d) => list.push(d.data() as Outlet));
      localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Firestore getOutlets unavailable, using fallback:', err);
  }

  // Fallback to backend API
  try {
    const res = await fetch('/api/outlets');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {}

  // Fallback to local storage
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
 * Adds a new outlet to Firestore (shared with all users)
 */
export async function addOutlet(name: string): Promise<Outlet> {
  const trimmed = name.trim().toUpperCase();
  const id = `sh-${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
  const newOutlet: Outlet = { id, name: trimmed, isCustom: true };

  // Write to Firestore
  try {
    await setDoc(doc(db, 'outlets', id), newOutlet);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `outlets/${id}`);
  }

  // Also notify server and local cache
  try {
    await fetch('/api/outlets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
  } catch {}

  try {
    const current = await getOutlets();
    const updated = [...current.filter((o) => o.id !== id), newOutlet];
    localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(updated));
  } catch {}

  return newOutlet;
}

/**
 * Deletes a custom outlet
 */
export async function deleteOutlet(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'outlets', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `outlets/${id}`);
  }

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
 * Subscribes to real-time month inventory updates for a specific outlet and period.
 * Completely ISOLATED per outlet so data never leaks to other outlets.
 */
export function subscribeOutletMonthData(
  outletId: string,
  period: string,
  onUpdate: (data: OutletMonthData) => void
): () => void {
  const docKey = `${outletId}_${period}`;
  const docRef = doc(db, 'inventory', docKey);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as OutletMonthData;
        const cacheKey = `${STORAGE_DATA_PREFIX}${docKey}`;
        localStorage.setItem(cacheKey, JSON.stringify(data));
        onUpdate(data);
      } else {
        // Document does not exist yet for this outlet and period
        const emptyData = createEmptyMonthData(outletId, period);
        onUpdate(emptyData);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `inventory/${docKey}`);
      // Fallback
      getOutletMonthData(outletId, period).then(onUpdate);
    }
  );

  return unsubscribe;
}

/**
 * Fetches an outlet's month data (containing Week 1 to Week 4)
 */
export async function getOutletMonthData(outletId: string, period: string): Promise<OutletMonthData> {
  const docKey = `${outletId}_${period}`;
  const cacheKey = `${STORAGE_DATA_PREFIX}${docKey}`;

  // Try Firestore
  try {
    const docRef = doc(db, 'inventory', docKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as OutletMonthData;
      localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Firestore getOutletMonthData error, falling back:', err);
  }

  // Try Backend
  try {
    const res = await fetch(`/api/inventory?outletId=${encodeURIComponent(outletId)}&period=${encodeURIComponent(period)}`);
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    }
  } catch {}

  // Try Local Storage
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  return createEmptyMonthData(outletId, period);
}

/**
 * Saves a week's inventory data to Firestore & notifies other users immediately
 */
export async function saveWeekData(
  outletId: string,
  period: string,
  weekId: WeekId,
  weekData: WeekData
): Promise<void> {
  const docKey = `${outletId}_${period}`;
  const cacheKey = `${STORAGE_DATA_PREFIX}${docKey}`;

  // Read current month record or build empty
  let monthObj: OutletMonthData;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      monthObj = JSON.parse(cached);
    } else {
      monthObj = createEmptyMonthData(outletId, period);
    }
  } catch {
    monthObj = createEmptyMonthData(outletId, period);
  }

  monthObj.weeks[weekId] = weekData;
  monthObj.lastUpdated = new Date().toISOString();

  // Save to local cache
  try {
    localStorage.setItem(cacheKey, JSON.stringify(monthObj));
  } catch {}

  // Write directly to Firestore
  try {
    const docRef = doc(db, 'inventory', docKey);
    await setDoc(docRef, monthObj, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `inventory/${docKey}`);
  }

  // Send to backend endpoint as secondary sync
  try {
    await fetch('/api/inventory/save-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outletId, period, weekId, weekData }),
    });
  } catch {}
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
  const currentMonthData = await getOutletMonthData(outletId, period);
  const prevWeek = currentMonthData.weeks[previousWeekId];

  if (!prevWeek || !prevWeek.items || prevWeek.items.length === 0) {
    return null;
  }

  const prevItems = prevWeek.items;
  const newItems = prevItems.map((prevIt) => {
    const carriedQty =
      prevIt.qtyActual !== '' && prevIt.qtyActual !== null && prevIt.qtyActual !== undefined
        ? Number(prevIt.qtyActual)
        : prevIt.qty;

    return {
      ...prevIt,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      qty: carriedQty,
      qtyActual: '' as const, // reset for the new week's physical opname count
    };
  });

  const updatedCurrentWeek: WeekData = {
    weekId: currentWeekId,
    weekLabel: currentMonthData.weeks[currentWeekId].weekLabel,
    uploadedAt: `Ditautkan dari ${prevWeek.weekLabel} (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})`,
    fileName: prevWeek.fileName ? `Carry-over ${prevWeek.fileName}` : 'Ditautkan dari minggu sebelumnya',
    items: newItems,
  };

  await saveWeekData(outletId, period, currentWeekId, updatedCurrentWeek);
  currentMonthData.weeks[currentWeekId] = updatedCurrentWeek;
  return currentMonthData;
}

/**
 * Clears week data in Firestore and local state
 */
export async function clearWeekData(
  outletId: string,
  period: string,
  weekId: WeekId
): Promise<void> {
  const emptyWeek: WeekData = {
    weekId,
    weekLabel: weekId === 'week-1' ? 'Week 1' : weekId === 'week-2' ? 'Week 2' : weekId === 'week-3' ? 'Week 3' : 'Week 4',
    uploadedAt: null,
    fileName: null,
    items: [],
  };

  await saveWeekData(outletId, period, weekId, emptyWeek);
}
