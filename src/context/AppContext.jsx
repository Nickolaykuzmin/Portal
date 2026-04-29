import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
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

// ─── Default categories ───────────────────────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  { id: 'income',        name: 'Дохід',             icon: 'payments',        color: '#006c49', type: 'income',  isDefault: true },
  { id: 'salary',        name: 'Зарплата',           icon: 'work',            color: '#006c49', type: 'income',  isDefault: true },
  { id: 'food',          name: 'Їжа та ресторани',   icon: 'restaurant',      color: '#ea580c', type: 'expense', isDefault: true },
  { id: 'transport',     name: 'Транспорт',           icon: 'commute',         color: '#2563eb', type: 'expense', isDefault: true },
  { id: 'shopping',      name: 'Шопінг',              icon: 'shopping_bag',    color: '#7c3aed', type: 'expense', isDefault: true },
  { id: 'utilities',     name: 'Комунальні',          icon: 'bolt',            color: '#d97706', type: 'expense', isDefault: true },
  { id: 'health',        name: "Здоров'я",            icon: 'local_hospital',  color: '#dc2626', type: 'expense', isDefault: true },
  { id: 'entertainment', name: 'Розваги',             icon: 'movie',           color: '#db2777', type: 'expense', isDefault: true },
  { id: 'travel',        name: 'Подорожі',            icon: 'flight',          color: '#0891b2', type: 'expense', isDefault: true },
  { id: 'education',     name: 'Освіта',              icon: 'school',          color: '#059669', type: 'expense', isDefault: true },
  { id: 'cash',          name: 'Готівка',             icon: 'payments',        color: '#64748b', type: 'expense', isDefault: true },
  { id: 'other',         name: 'Інше',                icon: 'category',        color: '#737686', type: 'expense', isDefault: true },
];

const AppContext = createContext(null);

// RON → EUR rate (fetched once, fallback to fixed rate)
const FALLBACK_RON_TO_EUR = 0.201;

export function AppProvider({ children }) {
  const [transactions, setTransactions]   = useState([]);
  const [categories,   setCategories]     = useState(DEFAULT_CATEGORIES);
  const [txLoading,    setTxLoading]      = useState(true);
  const [catLoading,   setCatLoading]     = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState('RON'); // 'RON' | 'EUR'
  const [exchangeRate, setExchangeRate]   = useState(FALLBACK_RON_TO_EUR); // RON → EUR
  const seededRef = useRef(false);

  // Fetch live EUR/RON rate once on mount
  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=RON&to=EUR')
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates?.EUR) setExchangeRate(data.rates.EUR);
      })
      .catch(() => { /* use fallback */ });
  }, []);

  // Convert amount from its native currency to displayCurrency
  const convertAmount = useCallback((amount, nativeCurrency = 'RON') => {
    if (displayCurrency === nativeCurrency) return amount;
    if (displayCurrency === 'EUR' && nativeCurrency === 'RON') return amount * exchangeRate;
    if (displayCurrency === 'RON' && nativeCurrency === 'EUR') return amount / exchangeRate;
    return amount;
  }, [displayCurrency, exchangeRate]);

  // ── Transactions listener ──────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTxLoading(false);
      },
      (err) => {
        console.error('Transactions listener error:', err);
        setTxLoading(false);
      },
    );
    return unsub;
  }, []);

  // ── Categories listener ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('name'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!seededRef.current) {
          seededRef.current = true;
          // Always upsert missing default categories (handles new ones added later)
          syncDefaultCategories(snap.docs.map((d) => d.id));
        }
        if (!snap.empty) {
          setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
        setCatLoading(false);
      },
      (err) => {
        console.error('Categories listener error:', err);
        setCatLoading(false);
      },
    );
    return unsub;
  }, []);

  // Write only the default categories that are missing in Firestore
  const syncDefaultCategories = async (existingIds) => {
    try {
      const missing = DEFAULT_CATEGORIES.filter((cat) => !existingIds.includes(cat.id));
      if (missing.length === 0) return;
      await Promise.all(
        missing.map((cat) =>
          setDoc(doc(db, 'categories', cat.id), {
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
  };

  // ── Transaction actions ────────────────────────────────────────────────────
  const addTransaction = (tx) =>
    addDoc(collection(db, 'transactions'), { ...tx, createdAt: serverTimestamp() });

  const addTransactions = (list) =>
    Promise.all(list.map((tx) =>
      addDoc(collection(db, 'transactions'), { ...tx, createdAt: serverTimestamp() }),
    ));

  const updateTransaction = (id, data) =>
    updateDoc(doc(db, 'transactions', id), data);

  const deleteTransaction = (id) =>
    deleteDoc(doc(db, 'transactions', id));

  // ── Category actions ───────────────────────────────────────────────────────
  const addCategory = (cat) =>
    addDoc(collection(db, 'categories'), { ...cat, isDefault: false, createdAt: serverTimestamp() });

  const updateCategory = (id, data) =>
    updateDoc(doc(db, 'categories', id), data);

  const deleteCategory = (id) =>
    deleteDoc(doc(db, 'categories', id));

  return (
    <AppContext.Provider value={{
      // data
      transactions,
      categories,
      txLoading,
      catLoading,
      // currency
      displayCurrency,
      setDisplayCurrency,
      exchangeRate,
      convertAmount,
      // tx actions
      addTransaction,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      // cat actions
      addCategory,
      updateCategory,
      deleteCategory,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
