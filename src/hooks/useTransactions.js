// Thin wrapper — real logic lives in AppContext (single Firestore listener)
import { useAppContext } from './useAppContext';

export function useTransactions() {
  const {
    transactions,
    txLoading: loading,
    addTransaction,
    addTransactions,
    mergeTransactions,
    updateTransaction,
    deleteTransaction,
  } = useAppContext();

  return { transactions, loading, addTransaction, addTransactions, mergeTransactions, updateTransaction, deleteTransaction };
}
