/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onFirestorePermissionChange } from '../firebase';
import { AlertCircle, Copy, Check, ExternalLink, X, ShieldAlert } from 'lucide-react';

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Koleksi test
    match /test/{docId} {
      allow read, write: if true;
    }

    // Koleksi outlets: Daftar cabang restoran bersama semua user
    match /outlets/{outletId} {
      allow read, write: if true;
    }

    // Koleksi inventory: Data stok opname terisolasi per cabang & bulan ({outletId}_{period})
    match /inventory/{recordId} {
      allow read, write: if true;
    }
  }
}`;

export const FirebaseRulesBanner: React.FC = () => {
  const [isDenied, setIsDenied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const unsub = onFirestorePermissionChange((denied) => {
      setIsDenied(denied);
    });
    return () => unsub();
  }, []);

  if (!isDenied || isDismissed) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-amber-950/70 border-b border-amber-700/60 text-amber-100 px-4 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-200 flex items-center gap-2">
              <span>Firebase Rules di Firebase Console Anda Belum Di-Publish</span>
              <span className="text-[10px] bg-amber-900/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/50">
                Mode Offline Lokal Aktif
              </span>
            </div>
            <p className="text-amber-300/80 mt-0.5">
              Aturan di console masih <code className="text-amber-200 font-mono bg-black/30 px-1 py-0.2 rounded">allow read, write: if false;</code>. Aplikasi tetap berjalan normal menggunakan Database Lokal. Untuk mengaktifkan sinkronisasi cloud real-time antar-perangkat, tempel aturan di Firebase Console Anda.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowCode(!showCode)}
            className="px-2.5 py-1.5 bg-amber-900/80 hover:bg-amber-800 text-amber-200 font-medium rounded-lg border border-amber-700/50 transition-colors"
          >
            {showCode ? 'Tutup Aturan' : 'Lihat Aturan'}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Disalin!' : 'Salin Rules'}</span>
          </button>

          <a
            href="https://console.firebase.google.com/project/inventory-project-50033/firestore/rules"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            <span>Buka Console</span>
            <ExternalLink className="w-3 h-3 text-amber-400" />
          </a>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-amber-400 hover:text-white rounded-lg transition-colors"
            title="Sembunyikan peringatan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showCode && (
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-amber-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-amber-300 font-semibold">
              firestore.rules (Tempel di tab Rules pada Firebase Console lalu klik Publish):
            </span>
            <button
              onClick={handleCopy}
              className="text-[11px] text-amber-400 hover:text-white underline flex items-center gap-1"
            >
              {copied ? 'Sudah disalin' : 'Salin Kode'}
            </button>
          </div>
          <pre className="bg-slate-950 p-3 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
            {FIRESTORE_RULES_SNIPPET}
          </pre>
        </div>
      )}
    </div>
  );
};
