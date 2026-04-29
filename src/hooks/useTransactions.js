// Thin wrapper — real logic lives in AppContext (single Firestore listener)
import { useAppContext } from '../context/AppContext';

export function useTransactions() {
  const {
    transactions,
    txLoading: loading,
    addTransaction,
    addTransactions,
    updateTransaction,
    deleteTransaction,
  } = useAppContext();

  return { transactions, loading, addTransaction, addTransactions, updateTransaction, deleteTransaction };
}
