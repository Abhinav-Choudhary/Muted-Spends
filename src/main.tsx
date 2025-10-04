import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './components/App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { CurrencyProvider } from './context/CurrencyContext.tsx'
import { LookupProvider } from './context/LookupContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CurrencyProvider>
        <LookupProvider>
          <App />
        </LookupProvider>
      </CurrencyProvider>
    </BrowserRouter>
  </StrictMode>,
)
