import { createContext, useEffect, useRef, useState, useCallback, useContext } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_CATEGORIES } from '../utils/defaultCategories';
import { AuthContext } from './AuthContext';
import type { Transaction, Category, NewTransaction, NewCategory, MergeResult, Currency } from '../types';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AppContextValue {
  // data
  transactions: Transaction[];
  categories: Category[];
  txLoading: boolean;
  catLoading: boolean;
  // currency
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  exchangeRate: number;
  convertAmount: (amount: number, nativeCurrency?: Currency) => number;
  // transaction actions
  addTransaction: (tx: NewTransaction) => Promise<unknown>;
  addTransactions: (list: NewTransaction[]) => Promise<unknown>;
  mergeTransactions: (list: NewTransaction[]) => Promise<MergeResult>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  // category actions
  addCategory: (cat: NewCategory) => Promise<unknown>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const FALLBACK_RON_TO_EUR = 0.201;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const authCtx = useContext(AuthContext);
  const user          = authCtx?.user ?? null;
  const activeAccount = authCtx?.activeAccount;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories,   setCategories]   = useState<Category[]>(DEFAULT_CATEGORIES);
  const [txLoading,    setTxLoading]    = useState(true);
  const [catLoading,   setCatLoading]   = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('RON');
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RON_TO_EUR);
  const seededRef = useRef(false);

  // ── Firestore path helpers ─────────────────────────────────────────────────
  // When user is logged in: users/{uid}/{accountId}/transactions
  // When not logged in (legacy): transactions (root collection)
  const txCollectionPath = useCallback((): string => {
    if (user && activeAccount) {
      return `users/${user.uid}/accounts/${activeAccount.id}/transactions`;
    }
    return 'transactions';
  }, [user, activeAccount]);

  const catCollectionPath = useCallback((): string => {
    if (user && activeAccount) {
      return `users/${user.uid}/accounts/${activeAccount.id}/categories`;
    }
    return 'categories';
  }, [user, activeAccount]);

  // ── Default categories sync ────────────────────────────────────────────────
  const syncDefaultCategories = useCallback(async (existingIds: string[]) => {
    try {
      const missing = DEFAULT_CATEGORIES.filter((cat) => !existingIds.includes(cat.id));
      if (missing.length === 0) return;
      const catPath = catCollectionPath();
      await Promise.all(
        missing.map((cat) =>
          setDoc(doc(db, catPath, cat.id), {
            name:      cat.name,
            icon:      cat.icon,
            color:     cat.color,
            type:      cat.type,
            isDefault: cat.isDefault,
            createdAt: serverTimestamp(),
          }),
        ),
      );
    } catch (e) {
      console.error('Sync categories error:', e);
    }
  }, [catCollectionPath]);

  // Fetch live EUR/RON rate once on mount
  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=RON&to=EUR')
      .then((r) => r.json())
      .then((data: { rates?: { EUR?: number } }) => {
        if (data?.rates?.EUR) setExchangeRate(data.rates.EUR);
      })
      .catch(() => { /* use fallback */ });
  }, []);

  // Convert amount from its native currency to displayCurrency
  const convertAmount = useCallback(
    (amount: number, nativeCurrency: Currency = 'RON'): number => {
      if (displayCurrency === nativeCurrency) return amount;
      if (displayCurrency === 'EUR' && nativeCurrency === 'RON') return amount * exchangeRate;
      if (displayCurrency === 'RON' && nativeCurrency === 'EUR') return amount / exchangeRate;
      return amount;
    },
    [displayCurrency, exchangeRate],
  );

  // ── Transactions listener ──────────────────────────────────────────────────
  useEffect(() => {
    // Reset state when account/user changes
    setTransactions([]);
    setTxLoading(true);

    const path = txCollectionPath();
    const q = query(collection(db, path), orderBy('date', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction)));
        setTxLoading(false);
      },
      (err) => {
        console.error('Transactions listener error:', err);
        setTxLoading(false);
      },
    );
    return unsub;
  }, [txCollectionPath]);

  // ── Categories listener ────────────────────────────────────────────────────
  useEffect(() => {
    setCategories(DEFAULT_CATEGORIES);
    setCatLoading(true);
    seededRef.current = false;

    const path = catCollectionPath();
    const q = query(collection(db, path), orderBy('name'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!seededRef.current) {
          seededRef.current = true;
          syncDefaultCategories(snap.docs.map((d) => d.id));
        }
        if (!snap.empty) {
          setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)));
        }
        setCatLoading(false);
      },
      (err) => {
        console.error('Categories listener error:', err);
        setCatLoading(false);
      },
    );
    return unsub;
  }, [catCollectionPath, syncDefaultCategories]);

  // ── Transaction actions ────────────────────────────────────────────────────
  const addTransaction = (tx: NewTransaction) =>
    addDoc(collection(db, txCollectionPath()), { ...tx, createdAt: serverTimestamp() });

  const addTransactions = (list: NewTransaction[]) =>
    Promise.all(list.map((tx) =>
      addDoc(collection(db, txCollectionPath()), { ...tx, createdAt: serverTimestamp() }),
    ));

  const mergeTransactions = async (list: NewTransaction[]): Promise<MergeResult> => {
    const existingKeys = new Set(
      transactions.map((tx) => `${tx.date}|${tx.amount}|${(tx.description || '').slice(0, 20)}`),
    );
    const newOnly = list.filter((tx) => {
      const key = `${tx.date}|${tx.amount}|${(tx.description || '').slice(0, 20)}`;
      return !existingKeys.has(key);
    });
    if (newOnly.length > 0) {
      await Promise.all(newOnly.map((tx) =>
        addDoc(collection(db, txCollectionPath()), { ...tx, createdAt: serverTimestamp() }),
      ));
    }
    return { added: newOnly.length, skipped: list.length - newOnly.length };
  };

  const updateTransaction = (id: string, data: Partial<Transaction>) =>
    updateDoc(doc(db, txCollectionPath(), id), data as Record<string, unknown>);

  const deleteTransaction = (id: string) =>
    deleteDoc(doc(db, txCollectionPath(), id));

  // ── Category actions ───────────────────────────────────────────────────────
  const addCategory = (cat: NewCategory) =>
    addDoc(collection(db, catCollectionPath()), { ...cat, isDefault: false, createdAt: serverTimestamp() });

  const updateCategory = (id: string, data: Partial<Category>) =>
    updateDoc(doc(db, catCollectionPath(), id), data as Record<string, unknown>);

  const deleteCategory = (id: string) =>
    deleteDoc(doc(db, catCollectionPath(), id));

  return (
    <AppContext.Provider value={{
      transactions,
      categories,
      txLoading,
      catLoading,
      displayCurrency,
      setDisplayCurrency,
      exchangeRate,
      convertAmount,
      addTransaction,
      addTransactions,
      mergeTransactions,
      updateTransaction,
      deleteTransaction,
      addCategory,
      updateCategory,
      deleteCategory,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export { AppContext };
