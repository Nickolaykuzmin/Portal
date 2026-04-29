import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Upload from './pages/Upload';
import Categories from './pages/Categories';
import Analytics from './pages/Analytics';
import Debug from './pages/Debug';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main
          className="main-content"
          style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}
        >
          <Routes>
            <Route path="/" element={<Overview onMenuClick={() => setSidebarOpen(true)} />} />
            <Route path="/transactions" element={<Transactions onMenuClick={() => setSidebarOpen(true)} />} />
            <Route path="/upload" element={<Upload onMenuClick={() => setSidebarOpen(true)} />} />
            <Route path="/categories" element={<Categories onMenuClick={() => setSidebarOpen(true)} />} />
            <Route path="/analytics" element={<Analytics onMenuClick={() => setSidebarOpen(true)} />} />
            <Route path="/debug" element={<Debug />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
