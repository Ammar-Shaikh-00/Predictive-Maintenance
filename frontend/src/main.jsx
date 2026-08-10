import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n';
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBackendStore } from './store/backendStore.jsx';
import { AuthProvider } from './context/authContext.jsx';
import GlobalErrorBoundary from './components/GlobalErrorBoundary.jsx';
import i18n from './i18n';

i18n.changeLanguage("de");

const queryClient = new QueryClient();
// Start backend health checker
useBackendStore.getState().startHealthCheck();

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </AuthProvider>
  </QueryClientProvider>
  
)
