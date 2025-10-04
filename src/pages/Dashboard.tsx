import { useState, useEffect } from 'react';
import { listenToTransactions, type Transaction } from '../services/firebaseService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { formatCurrency, categoryColors, paymentColors } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [periodIncome, setPeriodIncome] = useState<number>(0);
  const [periodExpenses, setPeriodExpenses] = useState<number>(0);
  const [cumulativeBalance, setCumulativeBalance] = useState<number>(0); // NEW: For the running total
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [monthlySpending, setMonthlySpending] = useState<any[]>([]);
  const { currentCurrency, usdToInrRate } = useCurrency();

  const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  
  const currentYear = new Date().getFullYear();
  const allYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    setLoading(true);
    // MODIFIED: Always fetch all transactions (year: 'all', month: 'all') 
    // to allow correct cumulative balance calculation. The sorting logic 
    // for transactions is primarily handled in the service, but we'll 
    // ensure chronological sorting for cumulative balance calculation below.
    const unsubscribe = listenToTransactions((fetchedTransactions) => {
      setTransactions(fetchedTransactions);
      setLoading(false);
    }, 'all', 'all');

    return () => unsubscribe();
  }, []); // Only runs once on mount

  useEffect(() => {
    // 1. Calculate Period Totals (for Income/Expense cards and charts)
    // Filter transactions to the currently selected year and month/all months.
    const finalPeriodTransactions = transactions.filter(t => {
      const date = t.timestamp.toDate();
      const transactionYear = date.getFullYear().toString();
      const transactionMonth = (date.getMonth() + 1).toString().padStart(2, '0');

      const yearMatch = selectedYear === 'all' || transactionYear === selectedYear;
      const monthMatch = selectedMonth === 'all' || transactionMonth === selectedMonth;

      // This array holds the transactions for the specifically selected time frame.
      return yearMatch && (selectedMonth === 'all' ? true : monthMatch);
    });

    const income = finalPeriodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = finalPeriodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    // UPDATED: Use new state variables for period data
    setPeriodIncome(income);
    setPeriodExpenses(expenses);
    
    // 2. Calculate Cumulative Balance
    const cumulativeTransactions = transactions.filter(t => {
      const date = t.timestamp.toDate();
      const transactionYear = date.getFullYear().toString();
      const transactionMonth = (date.getMonth() + 1).toString().padStart(2, '0');
      
      if (selectedYear === 'all' && selectedMonth === 'all') {
          return true; // Show all-time balance
      }

      // Chronological comparison
      if (transactionYear < selectedYear) {
          return true; // Include all transactions from previous years
      }
      
      if (transactionYear === selectedYear) {
          // If 'All Months' is selected, include all of the selected year
          if (selectedMonth === 'all') {
              return true;
          }
          // If a specific month is selected, only include up to and including that month
          if (parseInt(transactionMonth) <= parseInt(selectedMonth)) {
              return true;
          }
      }
      return false;
    });
    
    // Sum up the net balance of all transactions up to the selected period end date
    const netBalance = cumulativeTransactions.reduce((net, t) => {
        return net + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);
    setCumulativeBalance(netBalance);


    // 3. Update Monthly Spending (Bar Chart) - still based on the selected year's data
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(0, i).toLocaleString('en-US', { month: 'short' }),
      Expenses: 0,
    }));

    // Filter transactions to the selected year for the chart data
    const transactionsInSelectedYear = transactions.filter(t => 
      selectedYear === 'all' || t.timestamp.toDate().getFullYear().toString() === selectedYear
    );

    transactionsInSelectedYear.forEach(t => {
      if (t.type === 'expense') {
        const monthIndex = t.timestamp.toDate().getMonth();
        monthlyData[monthIndex].Expenses += t.amount;
      }
    });
    setMonthlySpending(monthlyData);

  }, [transactions, selectedYear, selectedMonth]);

  
  // Helper function to filter data for the pie charts based on the currently selected period
  const getPeriodFilter = (t: Transaction) => {
    const date = t.timestamp.toDate();
    const transactionYear = date.getFullYear().toString();
    const transactionMonth = (date.getMonth() + 1).toString().padStart(2, '0');

    const yearMatch = selectedYear === 'all' || transactionYear === selectedYear;
    const monthMatch = selectedMonth === 'all' || transactionMonth === selectedMonth;

    return t.type === 'expense' && yearMatch && (selectedMonth === 'all' ? true : monthMatch);
  };

  const expenseDataByCategory = Object.entries(
    transactions
      .filter(getPeriodFilter)
      .reduce<Record<string, number>>((acc, t) => {
        const category = t.category || 'Misc';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  const expenseDataByPaymentMethod = Object.entries(
    transactions
      .filter(getPeriodFilter)
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
            <option value="all">All Years</option> {/* ADDED: All Years option for cumulative view */}
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
          {/* MODIFIED: Display Period Income */}
          <h3 className="font-semibold text-slate-500">Total Income ({selectedMonth === 'all' ? 'Year' : 'Month'})</h3>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(periodIncome, currentCurrency, usdToInrRate)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          {/* MODIFIED: Display Period Expenses */}
          <h3 className="font-semibold text-slate-500">Total Expenses ({selectedMonth === 'all' ? 'Year' : 'Month'})</h3>
          <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(periodExpenses, currentCurrency, usdToInrRate)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          {/* MODIFIED: Display Cumulative Balance */}
          <h3 className="font-semibold text-slate-500">Current Balance (Cumulative)</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{formatCurrency(cumulativeBalance, currentCurrency, usdToInrRate)}</p>
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
                  // MODIFIED: Use periodExpenses for correct percentage calculation
                  const percentage = periodExpenses > 0 ? ((entry.value / periodExpenses) * 100).toFixed(1) : 0;
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
                   // MODIFIED: Use periodExpenses for correct percentage calculation
                  const percentage = periodExpenses > 0 ? ((entry.value / periodExpenses) * 100).toFixed(1) : 0;
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