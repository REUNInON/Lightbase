export interface Product {
  id: number;
  code: string;
  description: string | null;
  origin: string | null;
  stock: number | null; // loaded from Stock table (quantity_sqft)
  category: string | null;
  addedOn: number | null;
  updatedOn: number | null;
}

export interface Stock {
  id: number;
  productId: number;
  productCode?: string;
  productDescription?: string | null;
  productOrigin?: string | null;
  productCategory?: string | null;
  quantitySqft: number | null;
  updatedOn: number | null;
  product?: Product | null;
}

export interface CurrentAccount {
  id: number;
  code?: string | null;
  description: string | null;
  balance: number | null;
  updatedOn: number | null;
}

export type CATransactionType = 'AD' | 'BD' | 'NT' | 'NP';

export interface Catransaction {
  id: number;
  code: string | null;
  type: string | null;
  amount: number | null;
  currentAccountId: number | null;
  currentAccount?: CurrentAccount | null;
  date: number | null;
  note?: string | null;
}

export type StockMovementType = 'D' | 'G' | 'F'; // D: Devir Fişi, G: Üretimden Giriş, F: Fire Fişi

export interface StockMovement {
  id: number;
  productId: number;
  productCode?: string;
  productDescription?: string | null;
  productOrigin?: string | null;
  type: StockMovementType;
  quantitySqft: number;
  date: number;
  product?: Product | null;
}

export interface ProductTransaction {
  id: number;
  code: number | null;
  type: string | null;
  quantity: number | null;
  price: number | null;
  productId: number | null;
  product?: Product | null;
  date: number | null;
}

export type InvoiceType = 'ALIS' | 'SATIS' | 'ALIS_IADE' | 'SATIS_IADE';
export type Currency = 'TRY' | 'USD';

export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  productId: number | null;
  quantitySqft: number;
  unitPrice: number;
  totalPrice: number;
  product?: {
    id: number;
    code: string;
    description: string | null;
    origin?: string | null;
  } | null;
}

export interface Invoice {
  id: number;
  code: string;
  type: InvoiceType;
  currency: Currency;
  productId: number | null;
  product?: {
    id: number;
    code: string;
    description: string | null;
    origin?: string | null;
  } | null;
  currentAccountId: number | null;
  currentAccount?: CurrentAccount | null;
  date: number | null;
  amount: number | null;
  description: string | null;
  status?: 'ACTIVE' | 'CANCELLED';
  items?: InvoiceItem[];
}

export interface CashRegister {
  id: number;
  code: string | null;
  description: string;
  balance: number | null;
  updatedOn: number | null;
}

export type ChequeDocumentType = 'CEK' | 'SENET';
export type ChequePortfolioType = 'ALINAN' | 'VERILEN';

export interface ChequeNote {
  id: number;
  documentType: ChequeDocumentType;
  portfolioType: ChequePortfolioType;
  documentNumber: string | null;
  dueDate: number | null;
  amount: number | null;
  currentAccountId: number | null;
  currentAccount?: CurrentAccount | null;
  status: string | null;
  description: string | null;
  updatedOn: number | null;
}

export type Culture = 'tr-TR' | 'en';
export type ThemeMode = 'light' | 'dark';
