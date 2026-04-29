import { createContext, useEffect, useRef, useState, useCallback } from 'react';
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

const AppContext = createContext(null);

// RON → EUR rate (fetched once, fallback to fixed rate)
const FALLBACK_RON_TO_EUR = 0.201;

export function AppProvider({ children }) {
  const [transactions, setTransactions]   = useState([]);
  const [categories,   setCategories]     = useState(DEFAULT_CATEGORIES);
  const [txLoading,    setTxLoading]      = useState(true);
  const [catLoading,   setCatLoading]     = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState('RON');
  const [exchangeRate, setExchangeRate]   = useState(FALLBACK_RON_TO_EUR);
  const seededRef = useRef(false);

  // Write only the default categories that are missing in Firestore
  async function syncDefaultCategories(existingIds) {
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
  }

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

  // ── Transaction actions ────────────────────────────────────────────────────
  const addTransaction = (tx) =>
    addDoc(collection(db, 'transactions'), { ...tx, createdAt: serverTimestamp() });

  const addTransactions = (list) =>
    Promise.all(list.map((tx) =>
      addDoc(collection(db, 'transactions'), { ...tx, createdAt: serverTimestamp() }),
    ));

  // Merge: add only transactions that don't already exist (by date|amount|desc key)
  const mergeTransactions = async (list) => {
    const existingKeys = new Set(
      transactions.map((tx) => `${tx.date}|${tx.amount}|${(tx.description || '').slice(0, 20)}`)
    );
    const newOnly = list.filter((tx) => {
      const key = `${tx.date}|${tx.amount}|${(tx.description || '').slice(0, 20)}`;
      return !existingKeys.has(key);
    });
    if (newOnly.length > 0) {
      await Promise.all(newOnly.map((tx) =>
        addDoc(collection(db, 'transactions'), { ...tx, createdAt: serverTimestamp() }),
      ));
    }
    return { added: newOnly.length, skipped: list.length - newOnly.length };
  };

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
      mergeTransactions,
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

export { AppContext };
