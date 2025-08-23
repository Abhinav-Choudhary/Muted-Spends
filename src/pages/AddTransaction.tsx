import { useState, useEffect } from 'react';
import { listenToTransactions, deleteTransaction, type Transaction } from '../services/firebaseService';
import { formatCurrency } from '../utils/helpers';
import { TrashIcon, CurrencyDollarIcon, HomeIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [usdToInrRate, setUsdToInrRate] = useState<number | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<string>('USD');

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

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToTransactions((fetchedTransactions) => {
      setTransactions(fetchedTransactions);
      setLoading(false);
    }, selectedYear, selectedMonth);

    return () => unsubscribe();
  }, [selectedYear, selectedMonth]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction(id);
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    }
  };

  const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const allYears = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <ArrowPathIcon className="h-16 w-16 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-8">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Years</option>
            {allYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Months</option>
            {allMonths.map(month => (
              <option key={month} value={month}>
                {new Date(2024, Number(month) - 1, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={`${currentCurrency === 'USD' ? 'text-indigo-600' : 'text-slate-400'}`}>USD</span>
          <label className="switch relative inline-block w-12 h-6">
            <input type="checkbox" className="opacity-0 w-0 h-0" checked={currentCurrency === 'INR'} onChange={() => setCurrentCurrency(prev => prev === 'USD' ? 'INR' : 'USD')} />
            <span className="slider absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full transition-colors duration-200 before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:bg-indigo-600 checked:before:translate-x-6"></span>
          </label>
          <span className={`${currentCurrency === 'INR' ? 'text-indigo-600' : 'text-slate-400'}`}>INR</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <div className="grid grid-cols-4 gap-4 px-4 pb-3 border-b border-slate-200 mb-2 font-semibold text-slate-600 text-sm">
          <div className="col-span-2">DESCRIPTION</div>
          <div className="text-right">AMOUNT</div>
          <div className="text-right">ACTIONS</div>
        </div>
        {transactions.length > 0 ? (
          transactions.map((t) => (
            <div key={t.id} className="grid grid-cols-4 gap-2 items-center p-4 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="col-span-2 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${t.type === 'expense' ? 'bg-red-100' : 'bg-green-100'}`}>
                  {t.type === 'expense' ? (
                    <CurrencyDollarIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <HomeIcon className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-slate-800 break-words">{t.description}</p>
                  <p className="text-sm text-slate-500">
                    {t.timestamp?.toDate().toLocaleDateString()} &bull; {t.type === 'expense' ? t.category : 'Income'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-base ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                  {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount, currentCurrency, usdToInrRate)}
                </p>
              </div>
              <div className="col-span-1 text-right flex justify-end items-center gap-1">
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100"
                  title="Delete Transaction"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-slate-500 text-center py-10">No transactions yet.</p>
        )}
      </div>
    </div>
  );
};

export default Transactions;