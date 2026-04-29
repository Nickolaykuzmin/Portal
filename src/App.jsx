import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Upload from './pages/Upload';
import Categories from './pages/Categories';
import Analytics from './pages/Analytics';
import Debug from './pages/Debug';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
        <Sidebar />
        <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/debug" element={<Debug />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
