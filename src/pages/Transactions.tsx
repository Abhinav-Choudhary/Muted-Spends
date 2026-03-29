import { useState, useEffect } from 'react';
import { listenToTransactions, deleteTransaction, type Transaction } from '../services/firebaseService';
import { formatCurrency, formatTimestampForDisplay } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';
import { useLookups } from '../context/LookupContext';
import { TrashIcon, CurrencyDollarIcon, PencilIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface TransactionsProps {
  onEdit: (transaction: Transaction) => void;
  showToast: (message: string, type: 'income' | 'expense') => void;
}

const Transactions: React.FC<TransactionsProps> = ({ onEdit, showToast }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchAmount, setSearchAmount] = useState('');
  const { currentCurrency, usdToInrRate } = useCurrency();
  const { categories, paymentMethods, categoryColors, paymentColors, isLookupsLoading } = useLookups();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToTransactions((fetchedTransactions) => {
      const filteredByDate = fetchedTransactions.filter(t => {
        const date = t.timestamp?.toDate();
        if (!date) return false;
        const yearMatch = selectedYear === 'all' || date.getFullYear().toString() === selectedYear;
        const monthMatch = selectedMonth === 'all' || (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth;
        return yearMatch && monthMatch;
      });
      setTransactions(filteredByDate);
      setLoading(false);
    }, selectedYear, selectedMonth);

    return () => unsubscribe();
  }, [selectedYear, selectedMonth]);

  const handleDelete = async (id: string) => {
    const confirmed = await new Promise((resolve) => {
      resolve(window.confirm("Are you sure you want to delete this transaction?"));
    });

    if (confirmed) {
      try {
        await deleteTransaction(id);
        showToast('Transaction deleted successfully!', 'expense');
      } catch (error) {
        console.error("Error deleting document:", error);
        showToast('Failed to delete transaction.', 'expense');
      }
    }
  };

  const currentYear = new Date().getFullYear();
  const allYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const filteredTransactions = transactions.filter(t => {
    const descriptionMatch = t.description.toLowerCase().includes(searchTerm.toLowerCase());

    let amountMatch = true;
    if (searchAmount) {
      const formattedAmount = t.amount.toFixed(2);
      amountMatch = formattedAmount.includes(searchAmount);
    }

    const categoryMatch = selectedCategory === 'all' ||
      t.type === 'income' ||
      (t.type === 'expense' && t.category === selectedCategory);

    const paymentMethodMatch = selectedPaymentMethod === 'all' ||
      t.type === 'income' ||
      (t.type === 'expense' && t.paymentMethod === selectedPaymentMethod);

    return descriptionMatch && amountMatch && categoryMatch && paymentMethodMatch;
  });

  if (loading || isLookupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <ArrowPathIcon className="h-16 w-16 animate-spin text-indigo-600" />
      </div>
    );
  }

  const TagDisplay = ({ name, colorMap }: { name: string | undefined, colorMap: Record<string, string> }) => {
    if (!name) return <span className="text-slate-400 italic text-xs">N/A</span>;
    const color = colorMap[name] || '#94a3b8';
    return (
      <div className="flex items-center gap-1 text-sm min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
        <span className="truncate max-w-[70px] xs:max-w-none">{name}</span>
      </div>
    );
  };

  return (
    <div className="w-full overflow-hidden">
      {/* Filters and Search Bar Container */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-md shadow-sm pl-2 pr-8 py-2 text-sm focus:ring-indigo-500 w-[calc(50%-4px)] sm:w-auto"
          >
            <option value="all">Years</option>
            {allYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-300 rounded-md shadow-sm pl-2 pr-8 py-2 text-sm focus:ring-indigo-500 w-[calc(50%-4px)] sm:w-auto"
          >
            <option value="all">Months</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(month => (
              <option key={month} value={month}>
                {new Date(2024, Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' })}
              </option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-300 rounded-md shadow-sm pl-2 pr-8 py-2 text-sm focus:ring-indigo-500 w-[calc(50%-4px)] sm:w-auto"
          >
            <option value="all">Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="bg-white border border-slate-300 rounded-md shadow-sm pl-2 pr-8 py-2 text-sm focus:ring-indigo-500 w-[calc(50%-4px)] sm:w-auto"
          >
            <option value="all">Methods</option>
            {paymentMethods.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:ml-auto">
          <div className="relative w-full sm:w-48">
            <input
              type="text"
              placeholder="Search Desc"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSearchAmount(''); }}
              className="bg-white border border-slate-300 rounded-md shadow-sm pl-9 pr-2 py-2 text-sm w-full focus:ring-indigo-500"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
          <div className="relative w-full sm:w-36">
            <input
              type="number"
              placeholder="Amount"
              value={searchAmount}
              onChange={(e) => { setSearchAmount(e.target.value); setSearchTerm(''); }}
              className="bg-white border border-slate-300 rounded-md shadow-sm pl-9 pr-2 py-2 text-sm w-full focus:ring-indigo-500"
              step="0.01"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="bg-white p-2 sm:p-6 rounded-xl shadow-md border border-slate-200 overflow-hidden">
        {/* DESKTOP HEADER */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 pb-3 border-b border-slate-200 mb-2 font-semibold text-slate-600 text-sm">
          <div className="col-span-4">DESCRIPTION</div>
          <div className="col-span-2">CATEGORY</div>
          <div className="col-span-2">METHOD</div>
          <div className="col-span-2 text-right">AMOUNT</div>
          <div className="col-span-2 text-right">ACTIONS</div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((t) => (
              <div
                key={t.id}
                className="flex flex-col md:grid md:grid-cols-12 gap-y-2 md:gap-y-0 md:gap-x-4 items-center py-3 px-1 hover:bg-slate-50 transition-colors border-b border-slate-100 md:border-b-0"
              >
                <div className="flex justify-between items-start w-full md:col-span-4 md:items-center">
                  <div className="flex items-start gap-3 flex-grow min-w-0">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center ${t.type === 'expense' ? 'bg-red-100' : 'bg-green-100'}`}>
                      {t.type === 'expense' ? <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" /> : <ArrowTrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-slate-800 break-words text-sm sm:text-base">{t.description}</p>
                      <p className="text-xs text-slate-500">
                        {formatTimestampForDisplay(t.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="md:hidden flex-shrink-0 ml-2 text-right">
                    <p className={`font-bold text-base sm:text-lg ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                      {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount, currentCurrency, usdToInrRate)}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 hidden md:block">
                  {t.type === 'expense' ? <TagDisplay name={t.category} colorMap={categoryColors} /> : <span className="text-sm text-green-600 font-medium">N/A</span>}
                </div>
                <div className="col-span-2 hidden md:block">
                  {t.type === 'expense' ? <TagDisplay name={t.paymentMethod} colorMap={paymentColors} /> : <span className="text-sm text-green-600 font-medium">N/A</span>}
                </div>
                <div className="col-span-2 hidden md:block text-right font-bold text-lg">
                  <p className={t.type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                    {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount, currentCurrency, usdToInrRate)}
                  </p>
                </div>

                <div className="flex justify-between items-center w-full md:hidden pt-1">
                  <div className="flex justify-start gap-3 text-xs">
                    {t.type === 'expense' ? (
                      <>
                        <TagDisplay name={t.category} colorMap={categoryColors} />
                        <TagDisplay name={t.paymentMethod} colorMap={paymentColors} />
                      </>
                    ) : <span className="text-green-600 font-medium italic">Income</span>}
                  </div>
                  <div className="flex justify-end items-center gap-2">
                    <button onClick={() => onEdit(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-full bg-slate-50">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-full bg-slate-50">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="hidden md:flex col-span-2 justify-end items-center gap-1">
                  <button onClick={() => onEdit(t)} className="p-1 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-100" title="Edit">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100" title="Delete">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-10">No transactions found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;