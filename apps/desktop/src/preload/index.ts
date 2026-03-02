import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  login: (payload: { login: string; password: string }) => ipcRenderer.invoke('auth:login', payload),
  logout: (token: string) => ipcRenderer.invoke('auth:logout', token),

  listMaterials: (token: string, filter?: unknown) => ipcRenderer.invoke('materials:list', token, filter),
  saveMaterial: (token: string, payload: unknown) => ipcRenderer.invoke('materials:save', token, payload),
  deleteMaterial: (token: string, id: number) => ipcRenderer.invoke('materials:delete', token, id),

  addOperation: (token: string, payload: unknown) => ipcRenderer.invoke('operations:add', token, payload),

  listStock: (token: string, onlyLow?: boolean) => ipcRenderer.invoke('stock:list', token, onlyLow),

  reportOperations: (token: string, from: string, to: string) => ipcRenderer.invoke('reports:operations', token, from, to),
  reportStockByDate: (token: string, date: string) => ipcRenderer.invoke('reports:stockByDate', token, date),

  listUsers: (token: string) => ipcRenderer.invoke('users:list', token),
  saveUser: (token: string, payload: unknown) => ipcRenderer.invoke('users:save', token, payload),
  resetPassword: (token: string, userId: number, newPassword: string) => ipcRenderer.invoke('users:resetPassword', token, userId, newPassword),

  listAudit: (token: string) => ipcRenderer.invoke('audit:list', token),
  pingDb: () => ipcRenderer.invoke('system:pingDb'),
});

export {};
