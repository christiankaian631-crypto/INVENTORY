/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, setPermissionDeniedState } from '../firebase';
import { Outlet, DEFAULT_OUTLETS, OutletMonthData, WeekData, WeekId } from '../types/inventory';

const STORAGE_OUTLETS_KEY = 'restaurant_outlets_list';
const STORAGE_CUSTOM_OUTLETS_KEY = 'restaurant_custom_outlets_permanent';
const STORAGE_DELETED_OUTLET_IDS_KEY = 'restaurant_deleted_outlet_ids';
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
 * Custom Outlet Local Persistence Helpers
 */
export function getStoredCustomOutlets(): Outlet[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_OUTLETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredCustomOutlets(outlets: Outlet[]): void {
  try {
    localStorage.setItem(STORAGE_CUSTOM_OUTLETS_KEY, JSON.stringify(outlets));
  } catch {}
}

export function getDeletedOutletIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_OUTLET_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function markOutletDeleted(id: string): void {
  try {
    const current = getDeletedOutletIds();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(STORAGE_DELETED_OUTLET_IDS_KEY, JSON.stringify(current));
    }
    const custom = getStoredCustomOutlets().filter((o) => o.id !== id);
    saveStoredCustomOutlets(custom);
  } catch {}
}

export function unmarkOutletDeleted(id: string): void {
  try {
    const current = getDeletedOutletIds().filter((dId) => dId !== id);
    localStorage.setItem(STORAGE_DELETED_OUTLET_IDS_KEY, JSON.stringify(current));
  } catch {}
}

/**
 * Intelligent Multi-source Outlet Merger:
 * Combines default outlets + locally stored custom outlets + server outlets + firestore outlets,
 * ensuring custom outlets are NEVER dropped or overwritten unless explicitly deleted.
 */
export function mergeOutlets(...sources: (Outlet[] | undefined | null)[]): Outlet[] {
  const deletedIds = new Set(getDeletedOutletIds());
  const storedCustom = getStoredCustomOutlets();

  const map = new Map<string, Outlet>();

  // 1. Base Default Outlets
  for (const def of DEFAULT_OUTLETS) {
    if (!deletedIds.has(def.id)) {
      map.set(def.id, def);
    }
  }

  // 2. Stored custom outlets
  for (const cust of storedCustom) {
    if (cust && cust.id && cust.name && !deletedIds.has(cust.id)) {
      map.set(cust.id, { ...cust, isCustom: true });
    }
  }

  // 3. Incoming source outlets from backend server, firestore, or cache
  for (const source of sources) {
    if (Array.isArray(source)) {
      for (const item of source) {
        if (item && item.id && item.name && !deletedIds.has(item.id)) {
          const isDefault = DEFAULT_OUTLETS.some((d) => d.id === item.id);
          const outletObj: Outlet = {
            id: item.id,
            name: item.name,
            isCustom: item.isCustom ?? !isDefault,
          };
          map.set(item.id, outletObj);
        }
      }
    }
  }

  const result = Array.from(map.values());

  // Keep persistent custom outlet store synchronized
  const customList = result.filter((o) => o.isCustom);
  saveStoredCustomOutlets(customList);
  try {
    localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(result));
  } catch {}

  return result;
}

/**
 * Reads outlets from Local Storage and Server API (Zero failure fallback)
 */
export async function getLocalOutlets(): Promise<Outlet[]> {
  let serverData: Outlet[] = [];
  try {
    const res = await fetch('/api/outlets');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        serverData = data;
      }
    }
  } catch {}

  let cachedData: Outlet[] = [];
  try {
    const cached = localStorage.getItem(STORAGE_OUTLETS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) cachedData = parsed;
    }
  } catch {}

  return mergeOutlets(serverData, cachedData);
}

/**
 * Reads Month Inventory from Local Storage and Server API
 */
export async function getLocalMonthData(outletId: string, period: string): Promise<OutletMonthData> {
  const docKey = `${outletId}_${period}`;
  const cacheKey = `${STORAGE_DATA_PREFIX}${docKey}`;

  // Try Local Storage first for instant response
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  // Try Backend Express API
  try {
    const res = await fetch(`/api/inventory?outletId=${encodeURIComponent(outletId)}&period=${encodeURIComponent(period)}`);
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    }
  } catch {}

  return createEmptyMonthData(outletId, period);
}

/**
 * Subscribes to real-time outlets updates via Firestore with graceful local fallback
 */
export function subscribeOutlets(onUpdate: (outlets: Outlet[]) => void): () => void {
  // Immediately provide current local/cached/custom merged outlets
  getLocalOutlets().then((initial) => {
    onUpdate(initial);
  });

  try {
    const outletsCol = collection(db, 'outlets');
    const unsubscribe = onSnapshot(
      outletsCol,
      async (snapshot) => {
        setPermissionDeniedState(false);
        if (snapshot.empty) {
          // Attempt seeding defaults if cloud is empty
          try {
            for (const item of DEFAULT_OUTLETS) {
              await setDoc(doc(db, 'outlets', item.id), item);
            }
          } catch {}
          const merged = mergeOutlets(DEFAULT_OUTLETS);
          onUpdate(merged);
          return;
        }

        const list: Outlet[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Outlet);
        });

        const merged = mergeOutlets(list);
        onUpdate(merged);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'outlets');
        // Gracefully supply merged custom outlets without losing any user data
        getLocalOutlets().then(onUpdate);
      }
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
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
      const merged = mergeOutlets(list);
      setPermissionDeniedState(false);
      return merged;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'outlets');
  }

  return getLocalOutlets();
}

/**
 * Adds a new outlet to Firestore, Express backend, & permanent local storage
 */
export async function addOutlet(name: string): Promise<Outlet> {
  const trimmed = name.trim().toUpperCase();
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const id = `sh-${slug}-${Date.now().toString(36)}`;
  const newOutlet: Outlet = { id, name: trimmed, isCustom: true };

  // 1. Unmark deleted if was previously marked
  unmarkOutletDeleted(id);

  // 2. Add to permanent local custom outlets immediately
  const currentCustom = getStoredCustomOutlets().filter((o) => o.id !== id);
  currentCustom.push(newOutlet);
  saveStoredCustomOutlets(currentCustom);

  // 3. Update active cached outlets list
  const currentMerged = await getLocalOutlets();
  const updated = mergeOutlets(currentMerged, [newOutlet]);
  try {
    localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(updated));
  } catch {}

  // 4. Sync with Backend Express Server API (using exact client ID)
  try {
    await fetch('/api/outlets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: trimmed, isCustom: true }),
    });
  } catch (err) {
    console.warn('Backend sync warning for outlet', err);
  }

  // 5. Write to Firestore if permitted
  try {
    await setDoc(doc(db, 'outlets', id), newOutlet);
    setPermissionDeniedState(false);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `outlets/${id}`);
  }

  return newOutlet;
}

/**
 * Deletes a custom outlet permanently
 */
export async function deleteOutlet(id: string): Promise<void> {
  // 1. Mark as explicitly deleted in permanent store
  markOutletDeleted(id);

  // 2. Update local storage cache
  try {
    const current = await getLocalOutlets();
    const updated = current.filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_OUTLETS_KEY, JSON.stringify(updated));
  } catch {}

  // 3. Update Backend Server API
  try {
    await fetch(`/api/outlets/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {}

  // 4. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'outlets', id));
    setPermissionDeniedState(false);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `outlets/${id}`);
  }
}

/**
 * Subscribes to real-time month inventory updates for a specific outlet and period.
 * Completely ISOLATED per outlet.
 */
export function subscribeOutletMonthData(
  outletId: string,
  period: string,
  onUpdate: (data: OutletMonthData) => void
): () => void {
  const docKey = `${outletId}_${period}`;

  // Serve local cached data immediately for instant response
  getLocalMonthData(outletId, period).then(onUpdate);

  try {
    const docRef = doc(db, 'inventory', docKey);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setPermissionDeniedState(false);
        if (snapshot.exists()) {
          const data = snapshot.data() as OutletMonthData;
          const cacheKey = `${STORAGE_DATA_PREFIX}${docKey}`;
          localStorage.setItem(cacheKey, JSON.stringify(data));
          onUpdate(data);
        } else {
          const emptyData = createEmptyMonthData(outletId, period);
          onUpdate(emptyData);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `inventory/${docKey}`);
        // Gracefully use local data
        getLocalMonthData(outletId, period).then(onUpdate);
      }
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Fetches an outlet's month data (containing Week 1 to Week 4)
 */
export async function getOutletMonthData(outletId: string, period: string): Promise<OutletMonthData> {
  return getLocalMonthData(outletId, period);
}

/**
 * Saves a week's inventory data to local storage, backend server, and Firestore
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

  // 1. Save to local storage
  try {
    localStorage.setItem(cacheKey, JSON.stringify(monthObj));
  } catch {}

  // 2. Save to Express server database
  try {
    await fetch('/api/inventory/save-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outletId, period, weekId, weekData }),
    });
  } catch {}

  // 3. Write to Firestore for cloud live multi-device sync
  try {
    const docRef = doc(db, 'inventory', docKey);
    await setDoc(docRef, monthObj, { merge: true });
    setPermissionDeniedState(false);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `inventory/${docKey}`);
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
  const currentMonthData = await getLocalMonthData(outletId, period);
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
 * Clears week data in Firestore, backend, and local state
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
