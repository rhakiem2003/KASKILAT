import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { getPublicPage } from './features/legal/components/PublicPages.tsx';
import './index.css';

const publicPage = getPublicPage(window.location.pathname);

createRoot(document.getElementById('root')!).render(publicPage ?? <App />);
