/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      login: (payload: { login: string; password: string }) => Promise<any>;
      logout: (token: string) => Promise<boolean>;

      listMaterials: (token: string, filter?: unknown) => Promise<any[]>;
      saveMaterial: (token: string, payload: unknown) => Promise<boolean>;
      deleteMaterial: (token: string, id: number) => Promise<boolean>;

      addOperation: (token: string, payload: unknown) => Promise<boolean>;

      listStock: (token: string, onlyLow?: boolean) => Promise<any[]>;

      reportOperations: (token: string, from: string, to: string) => Promise<any[]>;
      reportStockByDate: (token: string, date: string) => Promise<any[]>;

      listUsers: (token: string) => Promise<any[]>;
      saveUser: (token: string, payload: unknown) => Promise<boolean>;
      resetPassword: (token: string, userId: number, newPassword: string) => Promise<boolean>;

      listAudit: (token: string) => Promise<any[]>;
      pingDb: () => Promise<{ ok: boolean; message?: string }>;
    };
  }
}
