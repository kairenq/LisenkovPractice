import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { db, logAction } from './db.js';

type Session = { login: string; role: string };
const sessions = new Map<string, Session>();

const permissions: Record<string, string[]> = {
  admin: ['*'],
  storekeeper: ['materials:crud', 'operations:write', 'stock:read'],
  accountant: ['reports:read', 'operations:read', 'stock:read'],
  manager: ['reports:read', 'stock:read'],
};

const SORT_COLUMNS = new Set(['name', 'category', 'unit', 'min_stock']);

function check(token: string, required: string) {
  const session = sessions.get(token);
  if (!session) throw new Error('UNAUTHORIZED');
  const rights = permissions[session.role] ?? [];
  if (!(rights.includes('*') || rights.includes(required))) throw new Error('FORBIDDEN');
  return session;
}

function asErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return 'INTERNAL_ERROR';
}

export function registerIpc() {
  ipcMain.handle('auth:login', (_event, payload: { login: string; password: string }) => {
    const user = db
      .prepare('SELECT login, password_hash, role, is_active FROM users WHERE login = ?')
      .get(payload.login) as { login: string; password_hash: string; role: string; is_active: number } | undefined;

    if (!user || !user.is_active || !bcrypt.compareSync(payload.password, user.password_hash)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = randomUUID();
    sessions.set(token, { login: user.login, role: user.role });
    logAction(user.login, 'login');
    return { token, user: { login: user.login, role: user.role } };
  });

  ipcMain.handle('auth:logout', (_event, token: string) => {
    const session = sessions.get(token);
    if (session) {
      logAction(session.login, 'logout');
      sessions.delete(token);
    }
    return true;
  });

  ipcMain.handle('materials:list', (_e, token: string, filter?: { search?: string; category?: string; sort?: string; dir?: 'asc' | 'desc' }) => {
    check(token, 'stock:read');
    const search = `%${(filter?.search ?? '').trim()}%`;
    const category = filter?.category ?? '';
    const sort = SORT_COLUMNS.has(filter?.sort ?? '') ? filter?.sort : 'name';
    const dir = filter?.dir === 'desc' ? 'DESC' : 'ASC';

    return db
      .prepare(
        `SELECT id, name, unit, category, min_stock as minStock
         FROM materials
         WHERE (? = '%%' OR name LIKE ? OR category LIKE ?)
           AND (? = '' OR category = ?)
         ORDER BY ${sort} ${dir}`,
      )
      .all(search, search, search, category, category);
  });

  ipcMain.handle('materials:save', (_e, token: string, payload: any) => {
    const session = check(token, 'materials:crud');
    if (!payload.name?.trim() || !payload.unit?.trim()) throw new Error('VALIDATION');
    if (Number(payload.minStock) < 0) throw new Error('NEGATIVE_VALUES');

    if (payload.id) {
      db.prepare('UPDATE materials SET name=?, unit=?, category=?, min_stock=? WHERE id=?').run(
        payload.name.trim(),
        payload.unit.trim(),
        payload.category?.trim() || null,
        Number(payload.minStock) || 0,
        payload.id,
      );
      logAction(session.login, 'material_update', String(payload.id));
    } else {
      const res = db.prepare('INSERT INTO materials (name, unit, category, min_stock) VALUES (?, ?, ?, ?)').run(
        payload.name.trim(),
        payload.unit.trim(),
        payload.category?.trim() || null,
        Number(payload.minStock) || 0,
      );
      logAction(session.login, 'material_create', String(res.lastInsertRowid));
    }
    return true;
  });

  ipcMain.handle('materials:delete', (_e, token: string, id: number) => {
    const session = check(token, 'materials:crud');
    db.prepare('DELETE FROM materials WHERE id=?').run(id);
    logAction(session.login, 'material_delete', String(id));
    return true;
  });

  ipcMain.handle('operations:add', (_e, token: string, payload: any) => {
    const session = check(token, 'operations:write');
    if (Number(payload.quantity) <= 0) throw new Error('INVALID_QUANTITY');

    const stock = db
      .prepare(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN quantity ELSE -quantity END),0) as qty FROM operations WHERE material_id=?`)
      .get(payload.materialId) as { qty: number };

    if (payload.type === 'expense' && Number(payload.quantity) > stock.qty) {
      throw new Error('NOT_ENOUGH_STOCK');
    }

    db.prepare('INSERT INTO operations (material_id, type, quantity, date, note, actor_login) VALUES (?, ?, ?, ?, ?, ?)').run(
      payload.materialId,
      payload.type,
      Number(payload.quantity),
      payload.date,
      payload.note?.trim() || null,
      session.login,
    );
    logAction(session.login, `operation_${payload.type}`, `${payload.materialId}:${payload.quantity}`);
    return true;
  });

  ipcMain.handle('stock:list', (_e, token: string, onlyLow = false) => {
    check(token, 'stock:read');
    const rows = db
      .prepare(
        `SELECT m.id as materialId, m.name as materialName, m.unit, m.category, m.min_stock as minStock,
          COALESCE(SUM(CASE WHEN o.type='income' THEN o.quantity ELSE -o.quantity END), 0) as currentStock
         FROM materials m
         LEFT JOIN operations o ON o.material_id = m.id
         GROUP BY m.id
         ORDER BY m.name`,
      )
      .all() as Array<{ minStock: number; currentStock: number }>;

    return onlyLow ? rows.filter((row) => row.currentStock < row.minStock) : rows;
  });

  ipcMain.handle('reports:operations', (_e, token: string, from: string, to: string) => {
    check(token, 'reports:read');
    return db
      .prepare(
        `SELECT o.id, m.name as materialName, m.category, o.type, o.quantity, o.date, o.note, o.actor_login as actorLogin
         FROM operations o JOIN materials m ON m.id=o.material_id
         WHERE o.date BETWEEN ? AND ?
         ORDER BY o.date DESC, o.id DESC`,
      )
      .all(from, to);
  });

  ipcMain.handle('reports:stockByDate', (_e, token: string, date: string) => {
    check(token, 'reports:read');
    return db
      .prepare(
        `SELECT m.name as materialName, m.unit, m.category, m.min_stock as minStock,
          COALESCE(SUM(CASE WHEN o.type='income' THEN o.quantity ELSE -o.quantity END), 0) as currentStock
         FROM materials m
         LEFT JOIN operations o ON o.material_id = m.id AND o.date <= ?
         GROUP BY m.id
         ORDER BY m.name`,
      )
      .all(date);
  });

  ipcMain.handle('users:list', (_e, token: string) => {
    check(token, '*');
    return db.prepare('SELECT id, login, role, is_active as isActive FROM users ORDER BY id').all();
  });

  ipcMain.handle('users:save', (_e, token: string, payload: any) => {
    const session = check(token, '*');
    if (!payload.login?.trim()) throw new Error('VALIDATION');

    if (payload.id) {
      db.prepare('UPDATE users SET login=?, role=?, is_active=? WHERE id=?').run(
        payload.login.trim(),
        payload.role,
        payload.isActive ? 1 : 0,
        payload.id,
      );
      if (payload.password?.trim()) {
        db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(payload.password, 10), payload.id);
      }
    } else {
      if (!payload.password?.trim()) throw new Error('VALIDATION');
      db.prepare('INSERT INTO users (login, password_hash, role, is_active) VALUES (?, ?, ?, ?)').run(
        payload.login.trim(),
        bcrypt.hashSync(payload.password, 10),
        payload.role,
        payload.isActive ? 1 : 0,
      );
    }
    logAction(session.login, 'user_save', payload.login);
    return true;
  });

  ipcMain.handle('users:resetPassword', (_e, token: string, userId: number, newPassword: string) => {
    const session = check(token, '*');
    if (!newPassword?.trim()) throw new Error('VALIDATION');
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), userId);
    logAction(session.login, 'user_password_reset', String(userId));
    return true;
  });

  ipcMain.handle('audit:list', (_e, token: string) => {
    check(token, '*');
    return db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300').all();
  });

  ipcMain.handle('system:pingDb', () => {
    try {
      db.prepare('SELECT 1').get();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: asErrorMessage(err) };
    }
  });
}
