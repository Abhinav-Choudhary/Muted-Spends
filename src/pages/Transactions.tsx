import { useState, useEffect } from 'react';
import { listenToTransactions, deleteTransaction, type Transaction } from '../services/firebaseService';
import { formatCurrency, formatTimestampForDisplay } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';
import { TrashIcon, CurrencyDollarIcon, PencilIcon, ArrowTrendingUpIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
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
  const [searchTerm, setSearchTerm] = useState('');
  const { currentCurrency, usdToInrRate } = useCurrency();

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
        showToast('Transaction deleted successfully!', 'expense');
      } catch (error) {
        console.error("Error deleting document:", error);
        showToast('Failed to delete transaction.', 'expense');
      }
    }
  };

  const handleViewReceipt = (transaction: Transaction) => {
    if (transaction.receiptUrl) {
      window.open(transaction.receiptUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast('No receipt found for this transaction.', 'expense');
    }
  };

  const currentYear = new Date().getFullYear();
  const allYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <ArrowPathIcon className="h-16 w-16 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
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
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(month => (
              <option key={month} value={month}>
                {new Date(2024, Number(month) - 1, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-grow w-full sm:w-auto">
            <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-300 rounded-md shadow-sm pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <div className="grid grid-cols-6 gap-4 px-4 pb-3 border-b border-slate-200 mb-2 font-semibold text-slate-600 text-sm">
          <div className="col-span-3">DESCRIPTION</div>
          <div className="col-span-1 text-right">AMOUNT</div>
          <div className="col-span-2 text-right">ACTIONS</div>
        </div>
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t) => (
            <div key={t.id} className="grid grid-cols-6 gap-2 items-center p-4 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="col-span-3 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${t.type === 'expense' ? 'bg-red-100' : 'bg-green-100'}`}>
                  {t.type === 'expense' ? (
                    <CurrencyDollarIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-slate-800 break-words">{t.description}</p>
                  <p className="text-sm text-slate-500">
                    {formatTimestampForDisplay(t.timestamp)} &bull; {t.type === 'expense' ? t.category : 'Income'}
                  </p>
                </div>
              </div>
              <div className="col-span-1 text-right">
                <p className={`font-bold text-base ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                  {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount, currentCurrency, usdToInrRate)}
                </p>
              </div>
              <div className="col-span-2 text-right flex justify-end items-center gap-1">
                 {t.type === 'expense' && (
                    <button
                        onClick={() => handleViewReceipt(t)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-100"
                        title="View Receipt"
                    >
                        <DocumentTextIcon className="h-5 w-5" />
                    </button>
                 )}
                 <button
                  onClick={() => onEdit(t)}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-100"
                  title="Edit Transaction"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
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
          <p className="text-slate-500 text-center py-10">
            {searchTerm ? `No transactions found for "${searchTerm}".` : 'No transactions for this period.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default Transactions;