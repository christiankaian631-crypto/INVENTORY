/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: "AIzaSyAGfbRx65R8TGeGwSpjcAbAR2O8gbKj_YU",
  authDomain: "inventory-project-50033.firebaseapp.com",
  projectId: "inventory-project-50033",
  storageBucket: "inventory-project-50033.firebasestorage.app",
  messagingSenderId: "589425636120",
  appId: "1:589425636120:web:2849ad6c9bc4ff447f246d",
  measurementId: "G-4GMPXTSQPB",
};

// Initialize or reuse app
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Analytics conditionally
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  }).catch(() => {});
}

// Track permission state for Firestore
type ErrorListener = (isPermissionDenied: boolean) => void;
const permissionListeners: Set<ErrorListener> = new Set();
let isPermissionDenied = false;

export function onFirestorePermissionChange(listener: ErrorListener): () => void {
  permissionListeners.add(listener);
  listener(isPermissionDenied);
  return () => {
    permissionListeners.delete(listener);
  };
}

export function setPermissionDeniedState(denied: boolean) {
  if (isPermissionDenied !== denied) {
    isPermissionDenied = denied;
    permissionListeners.forEach((l) => l(isPermissionDenied));
  }
}

/**
 * Validate Firestore server connectivity
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    setPermissionDeniedState(false);
    return true;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
      setPermissionDeniedState(true);
    }
    return false;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Missing or insufficient permissions') || (error as any)?.code === 'permission-denied') {
    setPermissionDeniedState(true);
  }
  const errInfo: FirestoreErrorInfo = {
    error: message,
    operationType,
    path,
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
}
