import { useState, useEffect } from 'react';
import { listenToTransactions, type Transaction } from '../services/firebaseService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, categoryColors, paymentColors } from '../utils/helpers';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [currentCurrency, setCurrentCurrency] = useState<string>('USD');
  const [usdToInrRate, setUsdToInrRate] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const allYears = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

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

  useEffect(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    setTotalIncome(income);
    setTotalExpenses(expenses);
  }, [transactions]);

  const expenseDataByCategory = Object.entries(
    transactions
      .filter(t => t.type === 'expense')
      .reduce<Record<string, number>>((acc, t) => {
        const category = t.category || 'Misc';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  const expenseDataByPaymentMethod = Object.entries(
    transactions
      .filter(t => t.type === 'expense')
      .reduce<Record<string, number>>((acc, t) => {
        const method = t.paymentMethod || 'Other';
        acc[method] = (acc[method] || 0) + t.amount;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  const handleCurrencyToggle = () => {
    setCurrentCurrency(prev => prev === 'USD' ? 'INR' : 'USD');
  };

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
            onChange={(e) => {
              setSelectedYear(e.target.value);
            }}
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
            <input type="checkbox" className="opacity-0 w-0 h-0" checked={currentCurrency === 'INR'} onChange={handleCurrencyToggle} />
            <span className="slider absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full transition-colors duration-200 before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:bg-indigo-600 checked:before:translate-x-6"></span>
          </label>
          <span className={`${currentCurrency === 'INR' ? 'text-indigo-600' : 'text-slate-400'}`}>INR</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h3 className="font-semibold text-slate-500">Total Income</h3>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome, currentCurrency, usdToInrRate)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h3 className="font-semibold text-slate-500">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses, currentCurrency, usdToInrRate)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h3 className="font-semibold text-slate-500">Current Balance</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{formatCurrency(totalIncome - totalExpenses, currentCurrency, usdToInrRate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Spending by Category</h2>
          {expenseDataByCategory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
              <div className="relative h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseDataByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
                      {expenseDataByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, currentCurrency, usdToInrRate)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {expenseDataByCategory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[entry.name] || '#94a3b8' }}></span>
                      <span>{entry.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(entry.value, currentCurrency, usdToInrRate)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-10">No spending data for this period.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Spending by Payment Method</h2>
          {expenseDataByPaymentMethod.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
              <div className="relative h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseDataByPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
                      {expenseDataByPaymentMethod.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={paymentColors[entry.name] || '#A0AEC0'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, currentCurrency, usdToInrRate)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {expenseDataByPaymentMethod.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: paymentColors[entry.name] || '#A0AEC0' }}></span>
                      <span>{entry.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(entry.value, currentCurrency, usdToInrRate)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-10">No payment method data for this period.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;