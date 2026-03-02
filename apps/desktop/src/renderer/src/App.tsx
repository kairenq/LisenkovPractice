import { useMemo, useState } from 'react';

type Role = 'admin' | 'storekeeper' | 'accountant' | 'manager';
type User = { id: number; login: string; password: string; role: Role; active: boolean };
type Material = { id: number; name: string; unit: string; category: string; min: number };
type Op = { id: number; materialId: number; type: 'income' | 'expense'; qty: number; date: string; note: string; actor: string };

type Store = { users: User[]; materials: Material[]; ops: Op[]; logs: string[] };

const KEY = 'material-tracker-local-v1';

const seed: Store = {
  users: [
    { id: 1, login: 'admin', password: 'admin123', role: 'admin', active: true },
    { id: 2, login: 'kladovshik', password: '123456', role: 'storekeeper', active: true },
    { id: 3, login: 'buhgalter', password: '123456', role: 'accountant', active: true },
    { id: 4, login: 'rukovoditel', password: '123456', role: 'manager', active: true },
  ],
  materials: [
    { id: 1, name: 'Бумага A4', unit: 'пачка', category: 'Канцтовары', min: 5 },
    { id: 2, name: 'Картридж', unit: 'шт', category: 'Расходники', min: 2 },
  ],
  ops: [
    { id: 1, materialId: 1, type: 'income', qty: 10, date: new Date().toISOString().slice(0, 10), note: 'Старт', actor: 'admin' },
    { id: 2, materialId: 2, type: 'income', qty: 3, date: new Date().toISOString().slice(0, 10), note: 'Старт', actor: 'admin' },
  ],
  logs: ['Система инициализирована'],
};

function loadStore(): Store {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw) as Store;
}

function saveStore(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [session, setSession] = useState<User | null>(null);
  const [tab, setTab] = useState('main');
  const [error, setError] = useState('');

  const update = (next: Store) => {
    setStore(next);
    saveStore(next);
  };

  if (!session) {
    return (
      <div className="login card">
        <h2>Вход</h2>
        <Login users={store.users} onOk={(u) => { setSession(u); setError(''); }} onFail={setError} />
        {error && <p className="err">{error}</p>}
      </div>
    );
  }

  const tabsByRole: Record<Role, string[]> = {
    admin: ['main', 'materials', 'ops', 'stock', 'reports', 'users', 'logs'],
    storekeeper: ['main', 'materials', 'ops', 'stock'],
    accountant: ['main', 'reports', 'stock'],
    manager: ['main', 'reports', 'stock'],
  };

  const tabs = tabsByRole[session.role];

  return (
    <div className="app">
      <header className="card header">
        <div>
          <h1>Учет расходуемого материала</h1>
          <p>{session.login} ({session.role})</p>
        </div>
        <button onClick={() => setSession(null)}>Выйти</button>
      </header>

      <nav className="tabs">
        {tabs.map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </nav>

      <main className="card main">
        {tab === 'main' && <Main />}
        {tab === 'materials' && <Materials store={store} setStore={update} actor={session.login} />}
        {tab === 'ops' && <Operations store={store} setStore={update} actor={session.login} />}
        {tab === 'stock' && <Stock store={store} />}
        {tab === 'reports' && <Reports store={store} />}
        {tab === 'users' && session.role === 'admin' && <Users store={store} setStore={update} actor={session.login} />}
        {tab === 'logs' && session.role === 'admin' && <Logs store={store} />}
      </main>
    </div>
  );
}

function Login({ users, onOk, onFail }: { users: User[]; onOk: (u: User) => void; onFail: (msg: string) => void }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('admin123');

  return (
    <>
      <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="логин" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="пароль" />
      <button onClick={() => {
        const u = users.find((x) => x.login === login && x.password === password && x.active);
        if (!u) return onFail('Неверный логин/пароль');
        onOk(u);
      }}>Войти</button>
    </>
  );
}

function Main() {
  return <div><h3>Главное окно</h3><p>Локальная версия без БД, все данные в localStorage.</p></div>;
}

function Materials({ store, setStore, actor }: { store: Store; setStore: (s: Store) => void; actor: string }) {
  const [f, setF] = useState({ name: '', unit: 'шт', category: '', min: 0 });
  return <section><h3>Материалы</h3><div className="grid"><input placeholder="Название" value={f.name} onChange={(e)=>setF({...f,name:e.target.value})}/><input placeholder="Ед." value={f.unit} onChange={(e)=>setF({...f,unit:e.target.value})}/><input placeholder="Категория" value={f.category} onChange={(e)=>setF({...f,category:e.target.value})}/><input type="number" value={f.min} onChange={(e)=>setF({...f,min:Number(e.target.value)})}/><button onClick={()=>{if(!f.name.trim())return; const id=Math.max(0,...store.materials.map(x=>x.id))+1; setStore({...store,materials:[...store.materials,{id,...f}],logs:[`${actor}: добавлен материал ${f.name}`,...store.logs]}); setF({name:'',unit:'шт',category:'',min:0});}}>Добавить</button></div><table><tbody>{store.materials.map((m)=><tr key={m.id}><td>{m.name}</td><td>{m.unit}</td><td>{m.category}</td><td>{m.min}</td></tr>)}</tbody></table></section>;
}

function Operations({ store, setStore, actor }: { store: Store; setStore: (s: Store) => void; actor: string }) {
  const [form, setForm] = useState({ materialId: store.materials[0]?.id ?? 0, type: 'income' as 'income'|'expense', qty: 1, date: new Date().toISOString().slice(0,10), note: '' });
  const stock = (id: number) => store.ops.filter((o) => o.materialId === id).reduce((s, o) => s + (o.type === 'income' ? o.qty : -o.qty), 0);
  return <section><h3>Приход/расход</h3><div className="grid"><select value={form.materialId} onChange={(e)=>setForm({...form,materialId:Number(e.target.value)})}>{store.materials.map((m)=><option key={m.id} value={m.id}>{m.name}</option>)}</select><select value={form.type} onChange={(e)=>setForm({...form,type:e.target.value as any})}><option value="income">Приход</option><option value="expense">Расход</option></select><input type="number" value={form.qty} onChange={(e)=>setForm({...form,qty:Number(e.target.value)})}/><input type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}/><input value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})} placeholder="комментарий"/><button onClick={()=>{if(form.qty<=0)return; if(form.type==='expense' && form.qty>stock(form.materialId)) return alert('Недостаточно остатка'); const id=Math.max(0,...store.ops.map(x=>x.id))+1; setStore({...store,ops:[...store.ops,{id,...form,actor}],logs:[`${actor}: ${form.type} ${form.qty}`,...store.logs]});}}>Сохранить</button></div></section>;
}

function Stock({ store }: { store: Store }) {
  const rows = useMemo(() => store.materials.map((m) => ({ ...m, qty: store.ops.filter((o) => o.materialId === m.id).reduce((s, o) => s + (o.type === 'income' ? o.qty : -o.qty), 0) })), [store]);
  return <section><h3>Остатки</h3><table><tbody>{rows.map((r)=><tr key={r.id} className={r.qty<r.min?'low':''}><td>{r.name}</td><td>{r.qty}</td><td>{r.unit}</td><td>{r.min}</td></tr>)}</tbody></table></section>;
}

function Reports({ store }: { store: Store }) {
  const [from, setFrom] = useState(new Date(Date.now()-1000*3600*24*30).toISOString().slice(0,10));
  const [to, setTo] = useState(new Date().toISOString().slice(0,10));
  const rows = store.ops.filter((o) => o.date >= from && o.date <= to);
  const exp = rows.filter((x) => x.type === 'expense').reduce((s,x)=>s+x.qty,0);
  return <section><h3>Отчеты</h3><div className="grid"><input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/><input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/><button onClick={()=>window.print()}>Печать/PDF</button></div><p>Расход за период: <b>{exp}</b></p><table><tbody>{rows.map((r)=><tr key={r.id}><td>{r.date}</td><td>{r.type}</td><td>{r.qty}</td><td>{r.actor}</td></tr>)}</tbody></table></section>;
}

function Users({ store, setStore, actor }: { store: Store; setStore: (s: Store) => void; actor: string }) {
  const [u, setU] = useState({ login: '', password: '123456', role: 'storekeeper' as Role, active: true });
  return <section><h3>Пользователи</h3><div className="grid"><input value={u.login} onChange={(e)=>setU({...u,login:e.target.value})} placeholder="логин"/><input value={u.password} onChange={(e)=>setU({...u,password:e.target.value})} placeholder="пароль"/><select value={u.role} onChange={(e)=>setU({...u,role:e.target.value as Role})}><option value="storekeeper">кладовщик</option><option value="accountant">бухгалтер</option><option value="manager">руководитель</option><option value="admin">админ</option></select><label><input type="checkbox" checked={u.active} onChange={(e)=>setU({...u,active:e.target.checked})}/> активен</label><button onClick={()=>{if(!u.login.trim())return; const id=Math.max(0,...store.users.map(x=>x.id))+1; setStore({...store,users:[...store.users,{id,...u}],logs:[`${actor}: добавлен пользователь ${u.login}`,...store.logs]});}}>Добавить</button></div><table><tbody>{store.users.map((x)=><tr key={x.id}><td>{x.login}</td><td>{x.role}</td><td>{x.active?'Да':'Нет'}</td></tr>)}</tbody></table></section>;
}

function Logs({ store }: { store: Store }) {
  return <section><h3>Логи</h3><ul>{store.logs.map((l,i)=><li key={i}>{l}</li>)}</ul></section>;
}
