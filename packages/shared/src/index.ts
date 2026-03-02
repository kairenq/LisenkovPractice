export type Role = 'admin' | 'storekeeper' | 'accountant' | 'manager';

export interface User {
  id: number;
  login: string;
  role: Role;
  isActive: boolean;
}

export interface Material {
  id: number;
  name: string;
  unit: string;
  category?: string;
  minStock?: number;
}

export interface StockRow {
  materialId: number;
  materialName: string;
  unit: string;
  category?: string;
  minStock?: number;
  currentStock: number;
}

export interface Operation {
  id: number;
  materialId: number;
  type: 'income' | 'expense';
  quantity: number;
  date: string;
  note?: string;
  actorLogin: string;
}
