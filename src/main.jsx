import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';

// StrictMode is intentionally omitted — it double-mounts components which
// causes Firestore's internal watch-stream state machine to assert.
createRoot(document.getElementById('root')).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
