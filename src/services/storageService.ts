import * as XLSX from 'xlsx';
import { Product, CurrentAccount, Catransaction, ProductTransaction } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'lightbase_products',
  CURRENT_ACCOUNTS: 'lightbase_current_accounts',
  CATRANSACTIONS: 'lightbase_catransactions',
  PRODUCT_TRANSACTIONS: 'lightbase_product_transactions',
};

// Initial data seeded from original lightbase.db
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    code: '128 Nappa',
    description: 'Kırmızı',
    origin: 'Pakistan',
    stock: 258.75,
    category: 'Naturel',
    addedOn: null,
    updatedOn: null,
  },
];

const INITIAL_CURRENT_ACCOUNTS: CurrentAccount[] = [
  {
    id: 2,
    description: 'Seçim Çanta',
    balance: 2000.0,
    updatedOn: null,
  },
];

const INITIAL_CATRANSACTIONS: Catransaction[] = [
  {
    id: 1,
    code: 'AD-26-0001',
    type: 'AD',
    amount: 120.0,
    currentAccountId: 2,
    date: null,
  },
  {
    id: 2,
    code: 'BD-26-0002',
    type: 'BD',
    amount: 120.0,
    currentAccountId: 2,
    date: null,
  },
];

const INITIAL_PRODUCT_TRANSACTIONS: ProductTransaction[] = [];

class StorageService {
  private getStorageItem<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      return JSON.parse(item);
    } catch {
      return fallback;
    }
  }

  private setStorageItem<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error('Storage write error', err);
    }
  }

  // --- PRODUCTS ---
  getProducts(search = ''): Product[] {
    const list = this.getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.code?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.origin?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }

  getProductById(id: number): Product | undefined {
    const list = this.getProducts();
    return list.find((p) => p.id === id);
  }

  createProduct(data: Omit<Product, 'id'>): Product {
    const list = this.getProducts();
    const newId = list.length > 0 ? Math.max(...list.map((p) => p.id)) + 1 : 1;
    const newProduct: Product = {
      ...data,
      id: newId,
      addedOn: data.addedOn ?? Date.now(),
      updatedOn: data.updatedOn ?? Date.now(),
    };
    list.push(newProduct);
    this.setStorageItem(STORAGE_KEYS.PRODUCTS, list);
    return newProduct;
  }

  updateProduct(id: number, data: Partial<Product>): Product {
    const list = this.getProducts();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    const updated: Product = {
      ...list[idx],
      ...data,
      id,
      updatedOn: Date.now(),
    };
    list[idx] = updated;
    this.setStorageItem(STORAGE_KEYS.PRODUCTS, list);
    return updated;
  }

  deleteProduct(id: number): boolean {
    const list = this.getProducts();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length === list.length) return false;
    this.setStorageItem(STORAGE_KEYS.PRODUCTS, filtered);
    return true;
  }

  // --- CURRENT ACCOUNTS ---
  getCurrentAccounts(search = ''): CurrentAccount[] {
    const list = this.getStorageItem<CurrentAccount[]>(
      STORAGE_KEYS.CURRENT_ACCOUNTS,
      INITIAL_CURRENT_ACCOUNTS
    );
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((a) => a.description?.toLowerCase().includes(q));
  }

  getCurrentAccountById(id: number): CurrentAccount | undefined {
    const list = this.getCurrentAccounts();
    return list.find((a) => a.id === id);
  }

  createCurrentAccount(data: Omit<CurrentAccount, 'id'>): CurrentAccount {
    const list = this.getCurrentAccounts();
    const newId = list.length > 0 ? Math.max(...list.map((a) => a.id)) + 1 : 1;
    const newAccount: CurrentAccount = {
      ...data,
      id: newId,
      updatedOn: data.updatedOn ?? Date.now(),
    };
    list.push(newAccount);
    this.setStorageItem(STORAGE_KEYS.CURRENT_ACCOUNTS, list);
    return newAccount;
  }

  updateCurrentAccount(id: number, data: Partial<CurrentAccount>): CurrentAccount {
    const list = this.getCurrentAccounts();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Account not found');
    const updated: CurrentAccount = {
      ...list[idx],
      ...data,
      id,
      updatedOn: Date.now(),
    };
    list[idx] = updated;
    this.setStorageItem(STORAGE_KEYS.CURRENT_ACCOUNTS, list);
    return updated;
  }

  deleteCurrentAccount(id: number): boolean {
    const list = this.getCurrentAccounts();
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length) return false;
    this.setStorageItem(STORAGE_KEYS.CURRENT_ACCOUNTS, filtered);
    return true;
  }

  // --- CATRANSACTIONS ---
  getCatransactions(search = ''): Catransaction[] {
    const list = this.getStorageItem<Catransaction[]>(
      STORAGE_KEYS.CATRANSACTIONS,
      INITIAL_CATRANSACTIONS
    );
    const accounts = this.getCurrentAccounts();
    const accountsMap = new Map(accounts.map((a) => [a.id, a]));

    const populated = list.map((tx) => ({
      ...tx,
      currentAccount: tx.currentAccountId ? accountsMap.get(tx.currentAccountId) ?? null : null,
    }));

    if (!search.trim()) return populated;
    const q = search.toLowerCase();
    return populated.filter(
      (tx) =>
        String(tx.code ?? '').toLowerCase().includes(q) ||
        (tx.type && tx.type.toLowerCase().includes(q)) ||
        (tx.currentAccount?.description && tx.currentAccount.description.toLowerCase().includes(q))
    );
  }

  getCatransactionById(id: number): Catransaction | undefined {
    const list = this.getCatransactions();
    return list.find((tx) => tx.id === id);
  }

  createCatransaction(data: Omit<Catransaction, 'id' | 'currentAccount'>): Catransaction {
    const list = this.getStorageItem<Catransaction[]>(
      STORAGE_KEYS.CATRANSACTIONS,
      INITIAL_CATRANSACTIONS
    );
    const newId = list.length > 0 ? Math.max(...list.map((t) => t.id)) + 1 : 1;
    const newTx: Catransaction = {
      ...data,
      id: newId,
      date: data.date ?? Date.now(),
    };
    list.push(newTx);
    this.setStorageItem(STORAGE_KEYS.CATRANSACTIONS, list);

    // Optionally update current account balance if amount exists
    if (data.currentAccountId && data.amount) {
      const acc = this.getCurrentAccountById(data.currentAccountId);
      if (acc) {
        const delta = (data.type?.toUpperCase() === 'C' ? -1 : 1) * Number(data.amount);
        this.updateCurrentAccount(data.currentAccountId, {
          balance: (acc.balance ?? 0) + delta,
        });
      }
    }

    return newTx;
  }

  updateCatransaction(id: number, data: Partial<Catransaction>): Catransaction {
    const list = this.getStorageItem<Catransaction[]>(
      STORAGE_KEYS.CATRANSACTIONS,
      INITIAL_CATRANSACTIONS
    );
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Transaction not found');
    const updated: Catransaction = {
      ...list[idx],
      ...data,
      id,
    };
    list[idx] = updated;
    this.setStorageItem(STORAGE_KEYS.CATRANSACTIONS, list);
    return updated;
  }

  deleteCatransaction(id: number): boolean {
    const list = this.getStorageItem<Catransaction[]>(
      STORAGE_KEYS.CATRANSACTIONS,
      INITIAL_CATRANSACTIONS
    );
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length === list.length) return false;
    this.setStorageItem(STORAGE_KEYS.CATRANSACTIONS, filtered);
    return true;
  }

  // --- PRODUCT TRANSACTIONS ---
  getProductTransactions(search = ''): ProductTransaction[] {
    const list = this.getStorageItem<ProductTransaction[]>(
      STORAGE_KEYS.PRODUCT_TRANSACTIONS,
      INITIAL_PRODUCT_TRANSACTIONS
    );
    const products = this.getProducts();
    const productsMap = new Map(products.map((p) => [p.id, p]));

    const populated = list.map((tx) => ({
      ...tx,
      product: tx.productId ? productsMap.get(tx.productId) ?? null : null,
    }));

    if (!search.trim()) return populated;
    const q = search.toLowerCase();
    return populated.filter(
      (tx) =>
        String(tx.code ?? '').toLowerCase().includes(q) ||
        (tx.type && tx.type.toLowerCase().includes(q)) ||
        (tx.product?.code && tx.product.code.toLowerCase().includes(q)) ||
        (tx.product?.description && tx.product.description.toLowerCase().includes(q))
    );
  }

  getProductTransactionById(id: number): ProductTransaction | undefined {
    const list = this.getProductTransactions();
    return list.find((tx) => tx.id === id);
  }

  createProductTransaction(
    data: Omit<ProductTransaction, 'id' | 'product'>
  ): ProductTransaction {
    const list = this.getStorageItem<ProductTransaction[]>(
      STORAGE_KEYS.PRODUCT_TRANSACTIONS,
      INITIAL_PRODUCT_TRANSACTIONS
    );
    const newId = list.length > 0 ? Math.max(...list.map((t) => t.id)) + 1 : 1;
    const newTx: ProductTransaction = {
      ...data,
      id: newId,
      date: data.date ?? Date.now(),
    };
    list.push(newTx);
    this.setStorageItem(STORAGE_KEYS.PRODUCT_TRANSACTIONS, list);

    // Update product stock if applicable (Type 'IN' or positive increases stock, 'OUT' decreases)
    if (data.productId && data.quantity) {
      const prod = this.getProductById(data.productId);
      if (prod) {
        const isOut = data.type?.toUpperCase() === 'OUT' || data.type?.toUpperCase() === 'Ç';
        const qtyChange = isOut ? -Number(data.quantity) : Number(data.quantity);
        this.updateProduct(data.productId, {
          stock: (prod.stock ?? 0) + qtyChange,
        });
      }
    }

    return newTx;
  }

  updateProductTransaction(
    id: number,
    data: Partial<ProductTransaction>
  ): ProductTransaction {
    const list = this.getStorageItem<ProductTransaction[]>(
      STORAGE_KEYS.PRODUCT_TRANSACTIONS,
      INITIAL_PRODUCT_TRANSACTIONS
    );
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Product transaction not found');
    const updated: ProductTransaction = {
      ...list[idx],
      ...data,
      id,
    };
    list[idx] = updated;
    this.setStorageItem(STORAGE_KEYS.PRODUCT_TRANSACTIONS, list);
    return updated;
  }

  deleteProductTransaction(id: number): boolean {
    const list = this.getStorageItem<ProductTransaction[]>(
      STORAGE_KEYS.PRODUCT_TRANSACTIONS,
      INITIAL_PRODUCT_TRANSACTIONS
    );
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length === list.length) return false;
    this.setStorageItem(STORAGE_KEYS.PRODUCT_TRANSACTIONS, filtered);
    return true;
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

export const storageService = new StorageService();
