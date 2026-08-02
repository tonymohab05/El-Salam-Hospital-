import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and gracefully silence browser-extension / MetaMask injected script connection errors in sandbox
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || '';
    if (
      reason.includes('MetaMask') || 
      reason.includes('metamask') || 
      reason.includes('ethereum') || 
      reason.includes('Provider') ||
      reason.includes('rpc') ||
      reason.includes('extension')
    ) {
      // Prevent browser console noise & telemetry reporting for external wallet extension connection failures
      event.preventDefault();
      console.warn('Gracefully silenced external extension connection event inside sandbox:', reason);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('MetaMask') || 
      msg.includes('metamask') || 
      msg.includes('ethereum') || 
      msg.includes('Provider') ||
      msg.includes('extension')
    ) {
      event.preventDefault();
      console.warn('Gracefully silenced external extension error inside sandbox:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

