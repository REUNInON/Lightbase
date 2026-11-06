import * as XLSX from 'xlsx';
import {
  Product,
  CurrentAccount,
  Catransaction,
  ProductTransaction,
  Invoice,
  InvoiceType,
  Stock,
  StockMovement,
  CashRegister,
  ChequeNote,
} from '../types';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed with status ${res.status}`);
    }
    return res.json();
  }

  // --- PRODUCTS ---
  async getProducts(search?: string): Promise<Product[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Product[]>(`/api/products${query}`);
  }

  async getProductById(id: number): Promise<Product> {
    return this.request<Product>(`/api/products/${id}`);
  }

  async createProduct(data: Omit<Product, 'id'> & { initialStock?: number }): Promise<Product> {
    return this.request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  // --- CURRENT ACCOUNTS ---
  async getNextCurrentAccountCode(
    branch: 'Z' | 'B' = 'Z'
  ): Promise<{ nextCode: string; branch: string; counter: number }> {
    return this.request<{ nextCode: string; branch: string; counter: number }>(
      `/api/current-accounts/next-code?branch=${encodeURIComponent(branch)}`
    );
  }

  async getCurrentAccounts(search?: string): Promise<CurrentAccount[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<CurrentAccount[]>(`/api/current-accounts${query}`);
  }

  async getCurrentAccountById(id: number): Promise<CurrentAccount> {
    return this.request<CurrentAccount>(`/api/current-accounts/${id}`);
  }

  async createCurrentAccount(data: Omit<CurrentAccount, 'id'>): Promise<CurrentAccount> {
    return this.request<CurrentAccount>('/api/current-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCurrentAccount(id: number, data: Partial<CurrentAccount>): Promise<CurrentAccount> {
    return this.request<CurrentAccount>(`/api/current-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCurrentAccount(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/current-accounts/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  // --- CATRANSACTIONS ---
  async getNextCATransactionCode(
    type: string,
    year?: string | number
  ): Promise<{ nextCode: string; prefix: string; year: string; counter: number }> {
    const qYear = year ? `&year=${encodeURIComponent(String(year))}` : '';
    return this.request<{ nextCode: string; prefix: string; year: string; counter: number }>(
      `/api/catransactions/next-code?type=${encodeURIComponent(type)}${qYear}`
    );
  }

  async getCatransactions(search?: string): Promise<Catransaction[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Catransaction[]>(`/api/catransactions${query}`);
  }

  async createCatransaction(
    data: Omit<Catransaction, 'id' | 'currentAccount'>
  ): Promise<Catransaction> {
    return this.request<Catransaction>('/api/catransactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCatransaction(id: number, data: Partial<Catransaction>): Promise<Catransaction> {
    return this.request<Catransaction>(`/api/catransactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCatransaction(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/catransactions/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  // --- PRODUCT TRANSACTIONS ---
  async getProductTransactions(search?: string): Promise<ProductTransaction[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<ProductTransaction[]>(`/api/product-transactions${query}`);
  }

  async createProductTransaction(
    data: Omit<ProductTransaction, 'id' | 'product'>
  ): Promise<ProductTransaction> {
    return this.request<ProductTransaction>('/api/product-transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProductTransaction(
    id: number,
    data: Partial<ProductTransaction>
  ): Promise<ProductTransaction> {
    return this.request<ProductTransaction>(`/api/product-transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProductTransaction(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/product-transactions/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  // --- FATURALAR (INVOICES) ---
  async getNextInvoiceCode(
    type: InvoiceType,
    year?: string | number
  ): Promise<{ nextCode: string; prefix: string; year: string; counter: number }> {
    const qYear = year ? `&year=${encodeURIComponent(String(year))}` : '';
    return this.request<{ nextCode: string; prefix: string; year: string; counter: number }>(
      `/api/invoices/next-code?type=${encodeURIComponent(type)}${qYear}`
    );
  }

  async getInvoices(search?: string): Promise<Invoice[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Invoice[]>(`/api/invoices${query}`);
  }

  async getInvoiceById(id: number): Promise<Invoice> {
    return this.request<Invoice>(`/api/invoices/${id}`);
  }

  async createInvoice(
    data: Omit<Invoice, 'id' | 'currentAccount' | 'product'>
  ): Promise<Invoice> {
    return this.request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    return this.request<Invoice>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelInvoice(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/invoices/${id}/cancel`, {
      method: 'POST',
    });
    return true;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  // --- STOCKS ---
  async getStocks(): Promise<Stock[]> {
    return this.request<Stock[]>('/api/stocks');
  }

  // --- STOK HAREKETLERI (STOCK MOVEMENTS) ---
  async getStockMovements(): Promise<StockMovement[]> {
    return this.request<StockMovement[]>('/api/stock-movements');
  }

  async createStockMovement(
    data: Omit<StockMovement, 'id' | 'product'>
  ): Promise<StockMovement> {
    return this.request<StockMovement>('/api/stock-movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteStockMovement(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/stock-movements/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  // --- KASA (CASH REGISTERS) ---
  async getCashRegisters(search?: string): Promise<CashRegister[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<CashRegister[]>(`/api/cash-registers${query}`);
  }

  async createCashRegister(data: Omit<CashRegister, 'id'>): Promise<CashRegister> {
    return this.request<CashRegister>('/api/cash-registers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCashRegister(id: number, data: Partial<CashRegister>): Promise<CashRegister> {
    return this.request<CashRegister>(`/api/cash-registers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCashRegister(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/cash-registers/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  // --- ÇEK VE SENET (CHEQUES & NOTES) ---
  async getCheques(search?: string): Promise<ChequeNote[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<ChequeNote[]>(`/api/cheques${query}`);
  }

  async createCheque(data: Omit<ChequeNote, 'id' | 'currentAccount'>): Promise<ChequeNote> {
    return this.request<ChequeNote>('/api/cheques', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCheque(id: number, data: Partial<ChequeNote>): Promise<ChequeNote> {
    return this.request<ChequeNote>(`/api/cheques/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCheque(id: number): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/cheques/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  // --- DATABASE BACKUP ---
  async downloadDatabaseBackup(): Promise<void> {
    const response = await fetch('/api/backup/db', {
      method: 'GET',
      headers: {
        Accept: 'application/x-sqlite3, application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Yedekleme indirilemedi: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `lightbase_${timestamp}.db`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // --- EXPORT UTILITIES ---
  exportToCSV(data: Record<string, unknown>[], fileName = 'Export'): void {
    if (!data.length) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportToExcel(data: Record<string, unknown>[], fileName = 'Export'): void {
    if (!data.length) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }
}

export const apiService = new ApiService();
