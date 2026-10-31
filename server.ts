/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'inventory-database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  outlets: { id: string; name: string; isCustom?: boolean }[];
  records: Record<string, any>; // key: `${outletId}_${period}`
}

const DEFAULT_OUTLETS = [
  { id: 'sh-alsut', name: 'SH ALSUT' },
  { id: 'sh-the-barn', name: 'SH THE BARN' },
  { id: 'sh-smb', name: 'SH SMB' },
  { id: 'sh-bintaro', name: 'SH BINTARO' },
  { id: 'sh-kemang', name: 'SH KEMANG' },
  { id: 'sh-cipete', name: 'SH CIPETE' },
  { id: 'sh-lebak-bulus', name: 'SH LEBAK BULUS' },
];

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.outlets)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading database file, initializing defaults', err);
  }

  const initialDb: DatabaseSchema = {
    outlets: DEFAULT_OUTLETS,
    records: {},
  };
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  let db = loadDatabase();

  // API Endpoints: Shared across all connected users

  // 1. Get all outlets
  app.get('/api/outlets', (req, res) => {
    res.json(db.outlets);
  });

  // 2. Add custom outlet
  app.post('/api/outlets', (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nama outlet wajib diisi' });
    }

    const trimmed = name.trim().toUpperCase();
    const id = `sh-${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newOutlet = { id, name: trimmed, isCustom: true };
    db.outlets.push(newOutlet);
    saveDatabase(db);

    res.json(newOutlet);
  });

  // 3. Delete custom outlet
  app.delete('/api/outlets/:id', (req, res) => {
    const { id } = req.params;
    db.outlets = db.outlets.filter((o) => o.id !== id);
    saveDatabase(db);
    res.json({ success: true, outlets: db.outlets });
  });

  // 4. Get Inventory Month Record for an outlet and period
  app.get('/api/inventory', (req, res) => {
    const { outletId, period } = req.query;
    if (!outletId || !period) {
      return res.status(400).json({ error: 'outletId and period are required' });
    }

    const recordKey = `${outletId}_${period}`;
    const record = db.records[recordKey] || {
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

    res.json(record);
  });

  // 5. Save/Update Week Inventory for specific outlet, period, and week
  app.post('/api/inventory/save-week', (req, res) => {
    const { outletId, period, weekId, weekData } = req.body;
    if (!outletId || !period || !weekId || !weekData) {
      return res.status(400).json({ error: 'Incomplete parameters' });
    }

    const recordKey = `${outletId}_${period}`;
    if (!db.records[recordKey]) {
      db.records[recordKey] = {
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

    db.records[recordKey].weeks[weekId] = weekData;
    db.records[recordKey].lastUpdated = new Date().toISOString();
    saveDatabase(db);

    res.json({ success: true, record: db.records[recordKey] });
  });

  // 6. Link previous week's actuals to current week's system Qty
  app.post('/api/inventory/link-previous-week', (req, res) => {
    const { outletId, period, currentWeekId, previousWeekId } = req.body;
    const recordKey = `${outletId}_${period}`;
    const record = db.records[recordKey];

    if (!record || !record.weeks[previousWeekId]) {
      return res.status(400).json({ error: 'Minggu sebelumnya belum memiliki data' });
    }

    const prevItems = record.weeks[previousWeekId].items;
    const currentWeek = record.weeks[currentWeekId];

    // Map each item from previous week, carrying over Qty Actual as new Qty System
    const newItems = prevItems.map((prevIt: any) => {
      const carriedQty =
        prevIt.qtyActual !== '' && prevIt.qtyActual !== null && prevIt.qtyActual !== undefined
          ? Number(prevIt.qtyActual)
          : prevIt.qty;

      return {
        ...prevIt,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        qty: carriedQty,
        qtyActual: '', // reset for the new week's physical count
      };
    });

    currentWeek.items = newItems;
    currentWeek.uploadedAt = `Ditautkan dari ${record.weeks[previousWeekId].weekLabel} (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})`;
    record.lastUpdated = new Date().toISOString();
    saveDatabase(db);

    res.json({ success: true, record });
  });

  // 7. Clear a specific week or all weeks for an outlet
  app.post('/api/inventory/clear-week', (req, res) => {
    const { outletId, period, weekId } = req.body;
    const recordKey = `${outletId}_${period}`;

    if (db.records[recordKey] && db.records[recordKey].weeks[weekId]) {
      db.records[recordKey].weeks[weekId] = {
        weekId,
        weekLabel: db.records[recordKey].weeks[weekId].weekLabel,
        uploadedAt: null,
        fileName: null,
        items: [],
      };
      saveDatabase(db);
    }

    res.json({ success: true });
  });

  // Mount Vite development middlewares or serve static dist
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
