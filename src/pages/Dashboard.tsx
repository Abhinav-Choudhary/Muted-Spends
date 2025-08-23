import { useState, useEffect } from 'react';
import { listenToTransactions, type Transaction } from '../services/firebaseService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { formatCurrency, categoryColors, paymentColors } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [monthlySpending, setMonthlySpending] = useState<any[]>([]);
  const { currentCurrency, usdToInrRate } = useCurrency();

  const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  
  const currentYear = new Date().getFullYear();
  const allYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToTransactions((fetchedTransactions) => {
      setTransactions(fetchedTransactions);
      setLoading(false);
    }, selectedYear, 'all');

    return () => unsubscribe();
  }, [selectedYear]);

  useEffect(() => {
    const filteredTransactions = selectedMonth === 'all' 
        ? transactions 
        : transactions.filter(t => t.timestamp.toDate().getMonth() + 1 === parseInt(selectedMonth));

    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    setTotalIncome(income);
    setTotalExpenses(expenses);
    
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(0, i).toLocaleString('en-US', { month: 'short' }),
      Expenses: 0,
    }));

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const monthIndex = t.timestamp.toDate().getMonth();
        monthlyData[monthIndex].Expenses += t.amount;
      }
    });
    setMonthlySpending(monthlyData);

  }, [transactions, selectedMonth]);

  const expenseDataByCategory = Object.entries(
    transactions
      .filter(t => t.type === 'expense' && (selectedMonth === 'all' || t.timestamp.toDate().getMonth() + 1 === parseInt(selectedMonth)))
      .reduce<Record<string, number>>((acc, t) => {
        const category = t.category || 'Misc';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  const expenseDataByPaymentMethod = Object.entries(
    transactions
      .filter(t => t.type === 'expense' && (selectedMonth === 'all' || t.timestamp.toDate().getMonth() + 1 === parseInt(selectedMonth)))
      .reduce<Record<string, number>>((acc, t) => {
        const method = t.paymentMethod || 'Other';
        acc[method] = (acc[method] || 0) + t.amount;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

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
                {expenseDataByCategory.map((entry, index) => {
                  const percentage = totalIncome > 0 ? ((entry.value / totalIncome) * 100).toFixed(1) : 0;
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[entry.name] || '#94a3b8' }}></span>
                        <span>{entry.name}</span>
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(entry.value, currentCurrency, usdToInrRate)}
                        <span className="text-slate-500 ml-2">({percentage}%)</span>
                      </div>
                    </div>
                  )
                })}
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
                {expenseDataByPaymentMethod.map((entry, index) => {
                  const percentage = totalIncome > 0 ? ((entry.value / totalIncome) * 100).toFixed(1) : 0;
                  return (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: paymentColors[entry.name] || '#A0AEC0' }}></span>
                      <span>{entry.name}</span>
                    </div>
                    <div className="font-semibold">
                        {formatCurrency(entry.value, currentCurrency, usdToInrRate)}
                        <span className="text-slate-500 ml-2">({percentage}%)</span>
                      </div>
                  </div>
                )})}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-10">No payment method data for this period.</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 lg:col-span-2">
            <h2 className="text-xl font-bold mb-4">Monthly Spending ({selectedYear})</h2>
            <div className="relative h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySpending} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => formatCurrency(value as number, currentCurrency, usdToInrRate).replace(/\..*$/, '')} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, currentCurrency, usdToInrRate)} />
                        <Legend />
                        <Bar dataKey="Expenses" fill="#4f46e5" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;