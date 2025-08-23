import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface CurrencyContextType {
  currentCurrency: string;
  usdToInrRate: number | null;
  handleCurrencyToggle: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currentCurrency, setCurrentCurrency] = useState<string>('USD');
  const [usdToInrRate, setUsdToInrRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setUsdToInrRate(data.rates.INR);
      } catch (error) {
        console.error("Failed to fetch exchange rate:", error);
      }
    };
    fetchExchangeRate();
  }, []);

  const handleCurrencyToggle = () => {
    setCurrentCurrency(prev => (prev === 'USD' ? 'INR' : 'USD'));
  };

  const value = {
    currentCurrency,
    usdToInrRate,
    handleCurrencyToggle,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
