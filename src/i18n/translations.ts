import { Culture } from '../types';

export interface Translations {
  appName: string;
  slogan: string;
  tagline: string;
  version: string;
  copyright: string;
  nav: {
    home: string;
    products: string;
    stocks: string;
    stockMovements: string;
    invoices: string;
    currentAccounts: string;
    catransactions: string;
    cashRegisters: string;
    cheques: string;
    productTransactions: string;
  };
  actions: {
    add: string;
    edit: string;
    delete: string;
    export: string;
    save: string;
    cancel: string;
    search: string;
    confirm: string;
    select: string;
    close: string;
    backupDb: string;
    downloadBackup: string;
    addItem: string;
    cancelInvoice: string;
  };
  caTypes: {
    AD: string;
    BD: string;
    NT: string;
    NP: string;
  };
  stockMovementTypes: {
    D: string;
    G: string;
    F: string;
  };
  invoiceTypes: {
    ALIS: string;
    SATIS: string;
    ALIS_IADE: string;
    SATIS_IADE: string;
  };
  chequeTypes: {
    CEK: string;
    SENET: string;
    ALINAN: string;
    VERILEN: string;
    PORTFOYDE: string;
    TAHSIL_EDILDI: string;
    ODENDI: string;
  };
  common: {
    id: string;
    code: string;
    description: string;
    date: string;
    type: string;
    amount: string;
    balance: string;
    stock: string;
    origin: string;
    category: string;
    quantity: string;
    price: string;
    addedOn: string;
    updatedOn: string;
    product: string;
    currentAccount: string;
    actions: string;
    items: string;
    page: string;
    of: string;
    rowsPerPage: string;
    noRecords: string;
    confirmDelete: string;
    cannotSave: string;
    unableToDelete: string;
    error: string;
    doubleClickHint: string;
    codeRequired: string;
    exportExcel: string;
    exportCSV: string;
    documentNumber: string;
    dueDate: string;
    status: string;
    draftNotice: string;
    currency: string;
    currencyTry: string;
    currencyUsd: string;
    stockSqft: string;
    initialStock: string;
    quantitySqft: string;
    unitPrice: string;
    totalPrice: string;
    grandTotal: string;
    productCodeHint: string;
    note: string;
    notes: string;
    notesPlaceholder: string;
    currentAccountCode: string;
    branch: string;
    branchZ: string;
    branchB: string;
    movementDate: string;
    loading: string;
    confirmCancelInvoice: string;
    cancelled: string;
    active: string;
  };
  dashboard: {
    welcome: string;
    totalProducts: string;
    totalStock: string;
    totalAccounts: string;
    totalBalance: string;
    totalInvoices: string;
    totalCashBalance: string;
    recentTransactions: string;
    quickActions: string;
    newProduct: string;
    newAccount: string;
    newTransaction: string;
    newInvoice: string;
    newCashRegister: string;
    newCheque: string;
  };
}

export const translations: Record<Culture, Translations> = {
  'tr-TR': {
    appName: 'Lightbase',
    slogan: 'Başarınız önceliğimizdir.',
    tagline: 'Stok yönetimi ve cari hesap takip sistemi.',
    version: 'Lightbase v1.0.0',
    copyright: 'Copyright Ⓒ 2026',
    nav: {
      home: 'Ana Sayfa',
      products: 'Ürünler',
      stocks: 'Stok',
      stockMovements: 'Stok Hareketleri',
      invoices: 'Faturalar',
      currentAccounts: 'Cari Hesaplar',
      catransactions: 'Cari Hareketler',
      cashRegisters: 'Kasa',
      cheques: 'Çek & Senet',
      productTransactions: 'Ürün Hareketleri',
    },
    actions: {
      add: 'Ekle',
      edit: 'Düzenle',
      delete: 'Sil',
      export: 'Dışa Aktar',
      save: 'Kaydet',
      cancel: 'İptal',
      search: 'Ara ...',
      confirm: 'Onayla',
      select: 'Seçiniz...',
      close: 'Kapat',
      backupDb: 'DB Yedekle',
      downloadBackup: 'lightbase.db Dosyasını İndir',
      addItem: 'Ürün Ekle',
      cancelInvoice: 'Faturayı İptal Et',
    },
    caTypes: {
      AD: 'Alacak Dekontu (AD)',
      BD: 'Borç Dekontu (BD)',
      NT: 'Nakit Tahsilat (NT)',
      NP: 'Nakit Ödeme (NP)',
    },
    stockMovementTypes: {
      D: 'Devir Fişi (D)',
      G: 'Üretimden Giriş (G)',
      F: 'Fire Fişi (F)',
    },
    invoiceTypes: {
      ALIS: 'Alış Faturası',
      SATIS: 'Satış Faturası',
      ALIS_IADE: 'Alış İade Faturası',
      SATIS_IADE: 'Satış İade Faturası',
    },
    chequeTypes: {
      CEK: 'Çek',
      SENET: 'Senet',
      ALINAN: 'Alınan (Müşteri)',
      VERILEN: 'Verilen (Borç)',
      PORTFOYDE: 'Portföyde',
      TAHSIL_EDILDI: 'Tahsil Edildi',
      ODENDI: 'Ödendi',
    },
    common: {
      id: 'Id',
      code: 'Kod',
      description: 'Açıklama',
      date: 'Tarih',
      type: 'Tür',
      amount: 'Tutar',
      balance: 'Bakiye',
      stock: 'Stok',
      origin: 'Menşei',
      category: 'Kategori',
      quantity: 'Miktar',
      price: 'Fiyat',
      addedOn: 'Eklenme Tarihi',
      updatedOn: 'Güncellenme Tarihi',
      product: 'Ürün',
      currentAccount: 'Cari Hesap',
      actions: 'İşlemler',
      items: 'kayıt',
      page: 'Sayfa',
      of: '/',
      rowsPerPage: 'Sayfa boyutu',
      noRecords: 'Gösterilecek kayıt bulunamadı',
      confirmDelete: 'Bu kaydı silmek istediğinizden emin misiniz?',
      cannotSave: 'Kayıt kaydedilemedi',
      unableToDelete: 'Kayıt silinemedi',
      error: 'Hata',
      doubleClickHint: 'Düzenlemek için satıra çift tıklayın',
      codeRequired: 'Kod alanı zorunludur',
      exportExcel: 'Excel',
      exportCSV: 'CSV',
      documentNumber: 'Evrak / Belge No',
      dueDate: 'Vade Tarihi',
      status: 'Durum',
      draftNotice: 'Taslak Modül',
      currency: 'Para Birimi',
      currencyTry: '$ USD',
      currencyUsd: '$ USD',
      stockSqft: 'Stok (ft²)',
      initialStock: 'Başlangıç Stoğu (ft²)',
      quantitySqft: 'Miktar (ft²)',
      unitPrice: 'Birim Fiyat',
      totalPrice: 'Satır Tutarı',
      grandTotal: 'Toplam Tutar',
      productCodeHint: 'Örn: Z.2.26.486 (Z/B . 1/2/3 . YY . PartiNo)',
      note: 'Not',
      notes: 'Notlar',
      notesPlaceholder: 'İsteğe bağlı not veya açıklama (en fazla 250 karakter)...',
      currentAccountCode: 'Cari Hesap Kodu',
      branch: 'Şube',
      branchZ: 'Zeytinburnu (Z)',
      branchB: 'Beyazıt (B)',
      movementDate: 'Güncelleme Tarihi',
      loading: 'Veriler yükleniyor...',
      confirmCancelInvoice: 'Bu faturayı iptal etmek istediğinizden emin misiniz? Faturanın cari hesap bakiyesi ve stok üzerindeki etkileri otomatik geri alınacaktır.',
      cancelled: 'İPTAL EDİLDİ',
      active: 'AKTİF',
    },
    dashboard: {
      welcome: 'Hoş Geldiniz',
      totalProducts: 'Toplam Ürün',
      totalStock: 'Toplam Stok Miktarı (ft²)',
      totalAccounts: 'Cari Hesaplar',
      totalBalance: 'Genel Bakiye',
      totalInvoices: 'Toplam Fatura',
      totalCashBalance: 'Toplam Kasa Bakiyesi',
      recentTransactions: 'Son Hareketler',
      quickActions: 'Hızlı İşlemler',
      newProduct: 'Yeni Ürün Ekle',
      newAccount: 'Yeni Cari Hesap',
      newTransaction: 'Yeni Cari Hareket',
      newInvoice: 'Yeni Fatura Kes',
      newCashRegister: 'Yeni Kasa Tanımla',
      newCheque: 'Yeni Çek / Senet Girişi',
    },
  },
  'en': {
    appName: 'Lightbase',
    slogan: 'Your success is our priority.',
    tagline: 'Inventory management and current account tracking system.',
    version: 'Lightbase v1.0.0',
    copyright: 'Copyright Ⓒ 2026',
    nav: {
      home: 'Home',
      products: 'Products',
      stocks: 'Stock',
      stockMovements: 'Stock Movements',
      invoices: 'Invoices',
      currentAccounts: 'Current Accounts',
      catransactions: 'Account Transactions',
      cashRegisters: 'Cash Registers',
      cheques: 'Cheques & Notes',
      productTransactions: 'Product Transactions',
    },
    actions: {
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      export: 'Export',
      save: 'Save',
      cancel: 'Cancel',
      search: 'Search ...',
      confirm: 'Confirm',
      select: 'Select...',
      close: 'Close',
      backupDb: 'Backup DB',
      downloadBackup: 'Download lightbase.db Backup',
      addItem: 'Add Product Item',
      cancelInvoice: 'Cancel Invoice',
    },
    caTypes: {
      AD: 'Credit Note (AD)',
      BD: 'Debit Note (BD)',
      NT: 'Cash Collection (NT)',
      NP: 'Cash Payment (NP)',
    },
    stockMovementTypes: {
      D: 'Opening / Transfer (D)',
      G: 'Production In (G)',
      F: 'Scrap / Waste (F)',
    },
    invoiceTypes: {
      ALIS: 'Purchase Invoice',
      SATIS: 'Sales Invoice',
      ALIS_IADE: 'Purchase Return Invoice',
      SATIS_IADE: 'Sales Return Invoice',
    },
    chequeTypes: {
      CEK: 'Cheque',
      SENET: 'Promissory Note',
      ALINAN: 'Received (Customer)',
      VERILEN: 'Given / Issued',
      PORTFOYDE: 'In Portfolio',
      TAHSIL_EDILDI: 'Collected',
      ODENDI: 'Paid',
    },
    common: {
      id: 'Id',
      code: 'Code',
      description: 'Description',
      date: 'Date',
      type: 'Type',
      amount: 'Amount',
      balance: 'Balance',
      stock: 'Stock',
      origin: 'Origin',
      category: 'Category',
      quantity: 'Quantity',
      price: 'Price',
      addedOn: 'Added On',
      updatedOn: 'Updated On',
      product: 'Product',
      currentAccount: 'Current Account',
      actions: 'Actions',
      items: 'items',
      page: 'Page',
      of: 'of',
      rowsPerPage: 'Page size',
      noRecords: 'No records to display',
      confirmDelete: 'Are you sure you want to delete this record?',
      cannotSave: 'Cannot save record',
      unableToDelete: 'Unable to delete record',
      error: 'Error',
      doubleClickHint: 'Double click row to edit',
      codeRequired: 'Code is required',
      exportExcel: 'Excel',
      exportCSV: 'CSV',
      documentNumber: 'Document No',
      dueDate: 'Due Date',
      status: 'Status',
      draftNotice: 'Draft Module',
      currency: 'Currency',
      currencyTry: '$ USD',
      currencyUsd: '$ USD',
      stockSqft: 'Stock (sqft)',
      initialStock: 'Initial Stock (sqft)',
      quantitySqft: 'Quantity (sqft)',
      unitPrice: 'Unit Price',
      totalPrice: 'Line Total',
      grandTotal: 'Grand Total',
      productCodeHint: 'e.g. Z.2.26.486 (Z/B . 1/2/3 . YY . LotNo)',
      note: 'Note',
      notes: 'Notes',
      notesPlaceholder: 'Optional note or remark (max 250 characters)...',
      currentAccountCode: 'Account Code',
      branch: 'Branch',
      branchZ: 'Zeytinburnu (Z)',
      branchB: 'Beyazıt (B)',
      movementDate: 'Update Date',
      loading: 'Loading data...',
      confirmCancelInvoice: 'Are you sure you want to cancel this invoice? Stock and account balances will be automatically reversed.',
      cancelled: 'CANCELLED',
      active: 'ACTIVE',
    },
    dashboard: {
      welcome: 'Welcome',
      totalProducts: 'Total Products',
      totalStock: 'Total Stock Quantity (sqft)',
      totalAccounts: 'Current Accounts',
      totalBalance: 'Overall Balance',
      totalInvoices: 'Total Invoices',
      totalCashBalance: 'Total Cash Balance',
      recentTransactions: 'Recent Transactions',
      quickActions: 'Quick Actions',
      newProduct: 'Add New Product',
      newAccount: 'Add Current Account',
      newTransaction: 'Add Transaction',
      newInvoice: 'New Invoice',
      newCashRegister: 'New Cash Register',
      newCheque: 'New Cheque / Note',
    },
  },
};
