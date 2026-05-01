import { createContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

// ─── Account types ────────────────────────────────────────────────────────────

export type AccountType = 'personal' | 'srl';

export interface Account {
  id: string;          // e.g. "personal" | "srl"
  type: AccountType;
  label: string;       // e.g. "Особистий" | "SRL"
  bank?: string;
}

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'personal', type: 'personal', label: 'Особистий рахунок' },
  { id: 'srl',      type: 'srl',      label: 'SRL рахунок' },
];

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  activeAccount: Account;
  accounts: Account[];
  setActiveAccount: (account: Account) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null);
  const [loading, setLoading]             = useState(true);
  const [activeAccount, setActiveAccountState] = useState<Account>(DEFAULT_ACCOUNTS[0]!);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Ensure user profile doc exists in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            displayName: firebaseUser.displayName,
            email:       firebaseUser.email,
            photoURL:    firebaseUser.photoURL,
            createdAt:   serverTimestamp(),
          });
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setActiveAccountState(DEFAULT_ACCOUNTS[0]!);
  };

  const setActiveAccount = (account: Account) => {
    setActiveAccountState(account);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      activeAccount,
      accounts: DEFAULT_ACCOUNTS,
      setActiveAccount,
      signInWithGoogle,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
