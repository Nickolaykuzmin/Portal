import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AppProvider } from './context/AppContext';

// StrictMode is intentionally omitted — it double-mounts components which
// causes Firestore's internal watch-stream state machine to assert.
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
