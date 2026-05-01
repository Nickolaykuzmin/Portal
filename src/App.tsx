import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Upload from './pages/Upload';
import Categories from './pages/Categories';
import Analytics from './pages/Analytics';
import Debug from './pages/Debug';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';

// ─── Auth guard ───────────────────────────────────────────────────────────────

function AuthenticatedApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main
        className="main-content"
        style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}
      >
        <Routes>
          <Route path="/"             element={<Overview     onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/transactions" element={<Transactions onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/upload"       element={<Upload       onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/categories"   element={<Categories   onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/analytics"    element={<Analytics    onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/debug"        element={<Debug />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
      }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 40, color: 'var(--primary)', animation: 'spin 1s linear infinite' }}
        >
          hourglass_top
        </span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/*"
          element={user ? <AuthenticatedApp /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
