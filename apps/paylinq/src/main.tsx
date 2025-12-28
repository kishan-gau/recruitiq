import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Track page loads to detect reload loops (persists across reloads)
const loadCount = parseInt(sessionStorage.getItem('pageLoadCount') || '0') + 1;
sessionStorage.setItem('pageLoadCount', loadCount.toString());
console.log(`🔄 [main.tsx] PAGE LOAD #${loadCount}`);
console.log('[main.tsx] Timestamp:', new Date().toISOString());

if (loadCount > 3) {
  console.error('⚠️ WARNING: Page has reloaded', loadCount, 'times! This indicates a reload loop.');
}

createRoot(document.getElementById('root')!).render(
  <App />
);
