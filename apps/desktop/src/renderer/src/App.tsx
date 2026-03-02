import { useCallback, useEffect, useMemo, useState } from 'react';

type Session = { token: string; user: { login: string; role: string } };
type Material = { id: number; name: string; unit: string; category?: string; minStock: number };

const roleTabs: Record<string, string[]> = {
  admin: ['overview', 'materials', 'operations', 'stock', 'reports', 'users', 'audit'],
  storekeeper: ['overview', 'materials', 'operations', 'stock'],
  accountant: ['overview', 'reports', 'stock'],
  manager: ['overview', 'reports', 'stock'],
};

const tabNames: Record<string, string> = {
  overview: 'Главное окно',
  materials: 'Материалы',
  operations: 'Приход/Расход',
  stock: 'Остатки',
  reports: 'Отчеты',
  users: 'Пользователи',
  audit: 'Логи',
};

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');
  const [dbError, setDbError] = useState('');

  useEffect(() => {
    window.api.pingDb().then((x) => {
      if (!x.ok) setDbError(`Ошибка БД: ${x.message ?? 'неизвестная ошибка'}`);
    });
  }, []);

  const tabs = useMemo(() => (session ? roleTabs[session.user.role] ?? [] : []), [session]);

  if (dbError) {
    return (
      <div className="login card">
        <h2>Ошибка подключения/БД</h2>
        <p className="err">{dbError}</p>
      </div>
    );
  }

  if (!session) {
    return <Login onLogged={setSession} onError={setError} error={error} />;
  }

  return (
    <div className="app">
      <header className="card header">
        <div>
          <h1>ИС "Учет расходуемого материала"</h1>
          <p>Пользователь: {session.user.login} ({session.user.role})</p>
        </div>
        <button className="ghost" onClick={() => window.api.logout(session.token).then(() => setSession(null))}>Выйти</button>
      </header>
      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={t === tab ? 'active' : ''}>
            {tabNames[t]}
          </button>
        ))}
      </nav>
      <main className="card main">
        {!tabs.includes(tab) ? (
          <h3>Нет доступа</h3>
        ) : (
          <Content tab={tab} token={session.token} role={session.user.role} />
        )}
      </main>
    </div>
  );
}

function Login({ onLogged, onError, error }: { onLogged: (s: Session) => void; onError: (e: string) => void; error: string }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('admin123');

  return (
    <div className="login card">
      <h2>Окно авторизации</h2>
      <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Пароль" />
      <button
        onClick={async () => {
          if (!login.trim() || !password.trim()) {
            onError('Заполните логин и пароль');
            return;
          }
          try {
            const res = await window.api.login({ login, password });
            onError('');
            onLogged(res);
          } catch {
            onError('Неверный логин или пароль');
          }
        }}
      >
        Войти
      </button>
      {error && <p className="err">{error}</p>}
      <small>Демо: admin/admin123</small>
    </div>
  );
}

function Content({ tab, token, role }: { tab: string; token: string; role: string }) {
  const [signal, setSignal] = useState(0);

  if (tab === 'overview') return <Overview role={role} />;
  if (tab === 'materials') return <Materials token={token} onChange={() => setSignal((x) => x + 1)} />;
  if (tab === 'operations') return <Operations token={token} onDone={() => setSignal((x) => x + 1)} />;
  if (tab === 'stock') return <Stock token={token} refresh={signal} />;
  if (tab === 'reports') return <Reports token={token} />;
  if (tab === 'users' && role === 'admin') return <Users token={token} />;
  if (tab === 'audit' && role === 'admin') return <Audit token={token} />;
  return <h3>Нет доступа</h3>;
}

function Overview({ role }: { role: string }) {
  return (
    <section>
      <h3>Главное окно</h3>
      <p>Роль: <b>{role}</b>. Используйте вкладки для выполнения операций учета.</p>
      <ul>
        <li>Добавляйте и редактируйте материалы.</li>
        <li>Фиксируйте приход/расход.</li>
        <li>Проверяйте остатки и отчеты.</li>
      </ul>
    </section>
  );
}

function Materials({ token, onChange }: { token: string; onChange: () => void }) {
  const [items, setItems] = useState<Material[]>([]);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'name' | 'category' | 'unit' | 'min_stock'>('name');
  const [form, setForm] = useState<any>({ name: '', unit: 'шт', category: '', minStock: 0 });

  const load = useCallback(async () => {
    const rows = await window.api.listMaterials(token, { search, category, sort, dir: 'asc' });
    setItems(rows);
  }, [token, search, category, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = Array.from(new Set(items.map((x) => x.category).filter(Boolean)));

  return (
    <section>
      <h3>Справочник материалов</h3>
      <div className="filters">
        <input placeholder="Поиск" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="name">Сорт: название</option>
          <option value="category">Сорт: категория</option>
          <option value="unit">Сорт: ед.изм</option>
          <option value="min_stock">Сорт: мин.остаток</option>
        </select>
      </div>

      <div className="grid form-grid">
        <input placeholder="Наименование" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Ед. изм." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <input placeholder="Категория" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input type="number" placeholder="Мин. остаток" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
        <button
          onClick={async () => {
            try {
              await window.api.saveMaterial(token, form);
              setForm({ name: '', unit: 'шт', category: '', minStock: 0 });
              setMsg('Материал сохранен');
              await load();
              onChange();
            } catch {
              setMsg('Ошибка: проверьте поля (без пустых/отрицательных значений)');
            }
          }}
        >Сохранить</button>
      </div>

      {msg && <p className="hint">{msg}</p>}

      <table>
        <thead><tr><th>Название</th><th>Ед.</th><th>Категория</th><th>Мин.</th><th>Действия</th></tr></thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td><td>{m.unit}</td><td>{m.category || '-'}</td><td>{m.minStock}</td>
              <td className="actions">
                <button onClick={() => setForm(m)}>Ред.</button>
                <button className="danger" onClick={async () => { await window.api.deleteMaterial(token, m.id); await load(); }}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Operations({ token, onDone }: { token: string; onDone: () => void }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState<any>({
    materialId: 0,
    type: 'income',
    quantity: 1,
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  useEffect(() => {
    window.api.listMaterials(token).then((rows) => {
      setMaterials(rows);
      if (rows[0]) setForm((old: any) => ({ ...old, materialId: rows[0].id }));
    });
  }, [token]);

  return (
    <section>
      <h3>Учет прихода и расхода</h3>
      <div className="grid form-grid">
        <select value={form.materialId} onChange={(e) => setForm({ ...form, materialId: Number(e.target.value) })}>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="income">Приход</option>
          <option value="expense">Расход</option>
        </select>
        <input type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input placeholder="Причина / комментарий" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button
          onClick={async () => {
            try {
              await window.api.addOperation(token, form);
              setMsg('Операция сохранена');
              onDone();
            } catch {
              setMsg('Ошибка: недостаточно остатка или неверное количество');
            }
          }}
        >Сохранить</button>
      </div>
      {msg && <p className="hint">{msg}</p>}
    </section>
  );
}

function Stock({ token, refresh }: { token: string; refresh: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [onlyLow, setOnlyLow] = useState(false);

  useEffect(() => {
    window.api.listStock(token, onlyLow).then(setRows);
  }, [token, refresh, onlyLow]);

  return (
    <section>
      <h3>Просмотр остатков</h3>
      <label><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} /> Только низкие остатки</label>
      <table>
        <thead><tr><th>Материал</th><th>Категория</th><th>Остаток</th><th>Ед.</th><th>Мин.</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.materialId} className={r.currentStock < r.minStock ? 'low' : ''}>
              <td>{r.materialName}</td><td>{r.category || '-'}</td><td>{Number(r.currentStock).toFixed(2)}</td><td>{r.unit}</td><td>{r.minStock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Reports({ token }: { token: string }) {
  const [from, setFrom] = useState(new Date(Date.now() - 1000 * 3600 * 24 * 30).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [stockDate, setStockDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<any[]>([]);
  const [stockRows, setStockRows] = useState<any[]>([]);

  const exportCsv = (list: any[], fileName: string, headers: string[], mapRow: (row: any) => string[]) => {
    const csv = [headers.join(','), ...list.map((x) => mapRow(x).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <h3>Формирование отчетов</h3>

      <div className="report-block">
        <h4>Отчет о расходе/операциях за период</h4>
        <div className="filters">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={async () => setRows(await window.api.reportOperations(token, from, to))}>Сформировать</button>
          <button onClick={() => exportCsv(rows, `operations-${from}-${to}.csv`, ['Материал', 'Категория', 'Тип', 'Количество', 'Дата', 'Комментарий', 'Пользователь'], (r) => [r.materialName, r.category ?? '', r.type, String(r.quantity), r.date, r.note ?? '', r.actorLogin])}>CSV</button>
          <button onClick={() => window.print()}>PDF/Печать</button>
        </div>
      </div>

      <table>
        <thead><tr><th>Материал</th><th>Категория</th><th>Тип</th><th>Кол-во</th><th>Дата</th><th>Пользователь</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{r.materialName}</td><td>{r.category || '-'}</td><td>{r.type}</td><td>{r.quantity}</td><td>{r.date}</td><td>{r.actorLogin}</td></tr>)}</tbody>
      </table>

      <div className="report-block">
        <h4>Отчет по остаткам на дату</h4>
        <div className="filters">
          <input type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} />
          <button onClick={async () => setStockRows(await window.api.reportStockByDate(token, stockDate))}>Сформировать</button>
          <button onClick={() => exportCsv(stockRows, `stock-${stockDate}.csv`, ['Материал', 'Категория', 'Остаток', 'Ед.', 'Мин.'], (r) => [r.materialName, r.category ?? '', String(r.currentStock), r.unit, String(r.minStock)])}>CSV</button>
        </div>
      </div>

      <table>
        <thead><tr><th>Материал</th><th>Категория</th><th>Остаток</th><th>Ед.</th><th>Мин.</th></tr></thead>
        <tbody>{stockRows.map((r) => <tr key={r.materialName}><td>{r.materialName}</td><td>{r.category || '-'}</td><td>{r.currentStock}</td><td>{r.unit}</td><td>{r.minStock}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function Users({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState<any>({ login: '', role: 'storekeeper', isActive: true, password: '123456' });

  const load = useCallback(async () => setUsers(await window.api.listUsers(token)), [token]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <h3>Управление пользователями</h3>
      <div className="grid form-grid">
        <input placeholder="Логин" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="storekeeper">Кладовщик</option>
          <option value="accountant">Бухгалтер</option>
          <option value="manager">Руководитель</option>
          <option value="admin">Администратор</option>
        </select>
        <input type="password" placeholder="Пароль" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <label><input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Активен</label>
        <button onClick={async () => { try { await window.api.saveUser(token, form); setMsg('Пользователь сохранен'); await load(); } catch { setMsg('Ошибка сохранения пользователя'); } }}>Сохранить</button>
      </div>
      {msg && <p className="hint">{msg}</p>}

      <table>
        <thead><tr><th>Логин</th><th>Роль</th><th>Активен</th><th>Действия</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.login}</td><td>{u.role}</td><td>{u.isActive ? 'Да' : 'Нет'}</td>
              <td className="actions">
                <button onClick={() => setForm({ ...u, password: '' })}>Ред.</button>
                <button onClick={async () => { const pass = prompt('Новый пароль', '123456'); if (!pass) return; await window.api.resetPassword(token, u.id, pass); setMsg('Пароль сброшен'); }}>Сброс пароля</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Audit({ token }: { token: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { window.api.listAudit(token).then(setRows); }, [token]);

  return (
    <section>
      <h3>Логи действий</h3>
      <table>
        <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Детали</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.actor_login}</td><td>{r.action}</td><td>{r.details}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
