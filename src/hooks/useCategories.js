// Thin wrapper — real logic lives in AppContext (single Firestore listener)
import { useAppContext } from '../context/AppContext';

export function useCategories() {
  const {
    categories,
    catLoading: loading,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useAppContext();

  return { categories, loading, addCategory, updateCategory, deleteCategory };
}
