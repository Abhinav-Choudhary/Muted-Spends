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
      // Client-side filtering based on selected year/month
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
    // Use custom modal in place of window.confirm
    const confirmed = await new Promise((resolve) => {
        // Since we don't have a custom Modal for confirmation, we'll revert to 
        // a standard browser confirm for now, but log an error to indicate it should be replaced.
        console.error("ALERT: Using standard browser confirmation. Replace with custom modal ASAP.");
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
        if (t.amount === parseFloat(searchAmount)) {
            amountMatch = true;
        } else {
            // For partial match on formatted amount (e.g., search "1.4" finds "1.49")
            const formattedAmount = t.amount.toFixed(2);
            amountMatch = formattedAmount.includes(searchAmount);
        }
    }
    
    // Category and Payment Method filtering
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
  
  // Custom display helper for Category/Payment Method with color dot
  const TagDisplay = ({ name, colorMap }: { name: string | undefined, colorMap: Record<string, string> }) => {
    if (!name) return <span className="text-slate-400 italic text-xs">N/A</span>;
    const color = colorMap[name] || '#94a3b8';
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
        <span className="truncate">{name}</span>
      </div>
    );
  };


  return (
    <div>
      {/* Filters and Search Bar Container */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
        
        {/* Date/Category/Method Filters Group */}
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          {/* Year and Month */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-[calc(50%-8px)] sm:w-auto"
          >
            <option value="all">All Years</option>
            {allYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-[calc(50%-8px)] sm:w-auto"
          >
            <option value="all">All Months</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(month => (
              <option key={month} value={month}>
                {new Date(2024, Number(month) - 1, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        
          {/* Category and Payment Method Filters */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-[calc(50%-8px)] sm:w-auto"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="bg-white border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-[calc(50%-8px)] sm:w-auto"
            >
              <option value="all">All Payment Methods</option>
              {paymentMethods.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
        </div>
        
        {/* Search Bar Group */}
        <div className="flex flex-wrap gap-4 w-full sm:w-auto sm:flex-nowrap sm:ml-auto"> 
            
            {/* Search Description */}
            <div className="relative w-full sm:w-56 flex-grow-0 flex-shrink-0"> 
                <input
                    type="text"
                    placeholder="Search By Description"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSearchAmount(''); // Clear amount search if description changes
                    }}
                    className="bg-white border border-slate-300 rounded-md shadow-sm pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                </div>
            </div>
            
            {/* Search Amount */}
            <div className="relative w-full sm:w-48 flex-shrink-0 flex-grow-0">
                <input
                    type="number"
                    placeholder="Search By Amount"
                    value={searchAmount}
                    onChange={(e) => {
                      setSearchAmount(e.target.value);
                      setSearchTerm(''); // Clear description search if amount changes
                    }}
                    className="bg-white border border-slate-300 rounded-md shadow-sm pl-10 pr-2 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    step="0.01"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                </div>
            </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        {/* DESKTOP/TABLET VIEW (>= md) - Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 pb-3 border-b border-slate-200 mb-2 font-semibold text-slate-600 text-sm">
          <div className="col-span-4">DESCRIPTION</div>
          <div className="col-span-2">CATEGORY</div>
          <div className="col-span-2">METHOD</div>
          <div className="col-span-2 text-right">AMOUNT</div>
          <div className="col-span-2 text-right">ACTIONS</div>
        </div>
        
        {/* Transaction List Container */}
        <div className="divide-y divide-slate-200">
            {filteredTransactions.length > 0 ? (
            filteredTransactions.map((t) => (
                <div 
                key={t.id} 
                className="flex flex-col md:grid md:grid-cols-12 gap-y-2 md:gap-y-0 md:gap-x-4 items-center py-2 px-1 hover:bg-slate-50 transition-colors 
                           border-b border-slate-200 md:border-b-0 md:py-2 md:px-4" 
                >
                {/* MOBILE ROW 1 / DESKTOP (ICON, DESC, DATE, AMOUNT) */}
                <div className="flex justify-between items-start w-full md:col-span-4 md:order-1 md:flex-row md:items-center">
                    {/* Left Side: ICON + DESCRIPTION/DATE */}
                    <div className="flex items-start gap-4 flex-grow">
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
                            {formatTimestampForDisplay(t.timestamp)} &bull; {t.type === 'expense' ? 'Expense' : 'Income'}
                            </p>
                        </div>
                    </div>
                    {/* Right Side (Mobile Amount): Show Amount here */}
                    <div className="md:hidden flex-shrink-0 ml-4 text-right flex flex-col items-end space-y-1">
                        <p className={`font-bold text-lg ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                            {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount, currentCurrency, usdToInrRate)}
                        </p>
                    </div>
                </div>

                {/* DESKTOP CATEGORY (Col 2) */}
                <div className="col-span-2 hidden md:block md:order-2">
                    {t.type === 'expense' ? (
                        <TagDisplay name={t.category} colorMap={categoryColors} />
                    ) : (
                        <span className="text-sm text-green-600 font-medium">N/A</span>
                    )}
                </div>

                {/* DESKTOP PAYMENT METHOD (Col 2) */}
                <div className="col-span-2 hidden md:block md:order-3">
                    {t.type === 'expense' ? (
                        <TagDisplay name={t.paymentMethod} colorMap={paymentColors} />
                    ) : (
                        <span className="text-sm text-green-600 font-medium">N/A</span>
                    )}
                </div>

                {/* DESKTOP AMOUNT (Col 2) */}
                <div className="col-span-2 hidden md:block md:order-4 text-right">
                    <p className={`font-bold text-lg ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                        {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount, currentCurrency, usdToInrRate)}
                    </p>
                </div>
                
                {/* MOBILE ROW 2 (Tags and Actions) - FULL WIDTH */}
                <div className="flex justify-between items-center w-full md:hidden order-2 pt-1">
                    {/* Tags (Left) */}
                    <div className="flex justify-start gap-4 text-sm">
                        {t.type === 'expense' ? (
                            <>
                                <div className="flex items-center">
                                    <TagDisplay name={t.category} colorMap={categoryColors} />
                                </div>
                                <div className="flex items-center">
                                    <TagDisplay name={t.paymentMethod} colorMap={paymentColors} />
                                </div>
                            </>
                        ) : (
                            <span className="text-sm text-green-600 font-medium">Income Details</span>
                        )}
                    </div>

                    {/* Actions (Right) - Moved from Row 1 */}
                    <div className="flex justify-end items-center gap-1">
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


                {/* DESKTOP ACTIONS (Col 2) */}
                <div className="hidden md:block col-span-2 md:order-5 text-right flex justify-end items-center gap-1">
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
                {searchTerm || searchAmount ? `No transactions found matching your criteria.` : 'No transactions for this period.'}
            </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;