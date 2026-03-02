import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';

export const db = new Database(join(app.getPath('userData'), 'material-tracker.db'));

export function runMigrations() {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      category TEXT,
      min_stock REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      quantity REAL NOT NULL CHECK(quantity > 0),
      date TEXT NOT NULL,
      note TEXT,
      actor_login TEXT NOT NULL,
      FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor_login TEXT NOT NULL,
      details TEXT,
      date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_operations_material ON operations(material_id);
    CREATE INDEX IF NOT EXISTS idx_operations_date ON operations(date);
  `);

  const adminExists = db.prepare('SELECT id FROM users WHERE login = ?').get('admin') as { id: number } | undefined;
  if (!adminExists) {
    const createUser = db.prepare('INSERT INTO users (login, password_hash, role) VALUES (?, ?, ?)');
    createUser.run('admin', bcrypt.hashSync('admin123', 10), 'admin');
    createUser.run('kladovshik', bcrypt.hashSync('123456', 10), 'storekeeper');
    createUser.run('buhgalter', bcrypt.hashSync('123456', 10), 'accountant');
    createUser.run('rukovoditel', bcrypt.hashSync('123456', 10), 'manager');
  }

  const anyMaterial = db.prepare('SELECT id FROM materials LIMIT 1').get() as { id: number } | undefined;
  if (!anyMaterial) {
    const addMaterial = db.prepare('INSERT INTO materials (name, unit, category, min_stock) VALUES (?, ?, ?, ?)');
    const paper = addMaterial.run('Бумага A4', 'пачка', 'Канцтовары', 5).lastInsertRowid;
    const toner = addMaterial.run('Картридж TN-2275', 'шт', 'Расходники', 2).lastInsertRowid;
    const marker = addMaterial.run('Маркер перманентный', 'шт', 'Канцтовары', 10).lastInsertRowid;

    const addOperation = db.prepare('INSERT INTO operations (material_id, type, quantity, date, note, actor_login) VALUES (?, ?, ?, ?, ?, ?)');
    const today = new Date().toISOString().slice(0, 10);
    addOperation.run(paper, 'income', 12, today, 'Стартовый остаток', 'admin');
    addOperation.run(toner, 'income', 4, today, 'Стартовый остаток', 'admin');
    addOperation.run(marker, 'income', 20, today, 'Стартовый остаток', 'admin');
  }
}

export function logAction(actor: string, action: string, details = '') {
  db.prepare('INSERT INTO audit_log (action, actor_login, details) VALUES (?, ?, ?)').run(action, actor, details);
}
