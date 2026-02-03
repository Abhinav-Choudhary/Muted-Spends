import { useState, useEffect, useMemo } from 'react';
import {
  listenToTransactions, listenToSubscriptions, listenToBankAccounts,
  type Transaction, type Subscription,
  type BankAccount
} from '../services/firebaseService';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart,
  Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { formatCurrency } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';
import { ArrowPathIcon, CreditCardIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useLookups } from '../context/LookupContext';

const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [periodIncome, setPeriodIncome] = useState<number>(0);
  const [periodExpenses, setPeriodExpenses] = useState<number>(0);
  const [cumulativeBalance, setCumulativeBalance] = useState<number>(0); // NEW: For the running total
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  // Calendar Specific State (Independent Navigation)
  const [calDate, setCalDate] = useState(new Date());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monthlySpending, setMonthlySpending] = useState<any[]>([]);
  const { currentCurrency, usdToInrRate } = useCurrency();
  const { categoryColors, paymentColors, isLookupsLoading } = useLookups();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeSubCount, setActiveSubCount] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  const currentYear = new Date().getFullYear();
  const allYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    setLoading(true);
    // Always fetch all transactions (year: 'all', month: 'all') 
    // to allow correct cumulative balance calculation. The sorting logic 
    // for transactions is primarily handled in the service, but we'll 
    // ensure chronological sorting for cumulative balance calculation below.
    const unsubscribe = listenToTransactions((fetchedTransactions) => {
      setTransactions(fetchedTransactions);
      setLoading(false);
    }, 'all', 'all');

    return () => unsubscribe();
  }, []); // Only runs once on mount

  // 2. Sync Calendar with Global Filters initially, but allow deviation
  useEffect(() => {
    if (selectedYear !== 'all' && selectedMonth !== 'all') {
      setCalDate(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1));
    }
  }, [selectedYear, selectedMonth]);

  // 2. Fetch Subscriptions
  useEffect(() => {
    const unsubscribe = listenToSubscriptions((subs) => {
      // Filter active AND sort by amount descending immediately
      // This ensures the list order matches the color index perfectly
      const active = subs
        .filter(s => s.include)
        .sort((a, b) => b.amount - a.amount);
      setSubscriptions(active);
      setActiveSubCount(active.length);
    });
    return () => unsubscribe();
  }, []);

  // 3. Fetch Bank Accounts (for Autopay dates)
  useEffect(() => {
    const unsubscribe = listenToBankAccounts((accounts) => {
      setBankAccounts(accounts);
    });
    return () => unsubscribe();
  }, []);

  // 4. Calculate Totals & Charts
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

    // Use new state variables for period data
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

  // --- CALENDAR LOGIC START ---
  // --- CALENDAR DATA PREPARATION (REPLACES renderCalendar) ---
  // We use useMemo to calculate all the data once, then render it differently for Mobile vs Desktop
  const calendarData = useMemo(() => {
    const viewYear = calDate.getFullYear();
    const viewMonth = calDate.getMonth() + 1;
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const startDay = new Date(viewYear, viewMonth - 1, 1).getDay();

    // 1. Calculate Daily Totals & Max Spend
    const dailyTotals: Record<number, number> = {};
    transactions.forEach(t => {
      const d = t.timestamp.toDate();
      if (d.getFullYear() === viewYear && (d.getMonth() + 1) === viewMonth && t.type === 'expense') {
        const day = d.getDate();
        dailyTotals[day] = (dailyTotals[day] || 0) + t.amount;
      }
    });

    // 2. Determine Baseline for Heatmap
    const safeRate = usdToInrRate || 84;
    const baseLine = currentCurrency === 'USD' ? 500 : (500 * safeRate);
    const maxDailySpend = Math.max(...Object.values(dailyTotals), baseLine);

    // 3. Build Day Objects
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTrans = transactions.filter(t => {
        const d = t.timestamp.toDate();
        return d.getFullYear() === viewYear && (d.getMonth() + 1) === viewMonth && d.getDate() === day && t.type === 'expense';
      });
      const daySubs = subscriptions.filter(s => s.include && s.billingDay === day);
      const dayAutopays = bankAccounts.filter(acc =>
        acc.accountType === 'Credit Card' && acc.autopayDate && parseInt(acc.autopayDate) === day
      );

      const totalSpent = dailyTotals[day] || 0;
      const heatIntensity = totalSpent > 0 ? (totalSpent / maxDailySpend) : 0;
      const bgOpacity = totalSpent > 0 ? Math.min(Math.max(heatIntensity * 0.9, 0.1), 0.85) : 0;

      const dateObj = new Date(viewYear, viewMonth - 1, day);

      days.push({
        day,
        dateObj,
        totalSpent,
        bgOpacity,
        dayTrans,
        daySubs,
        dayAutopays,
        // Styling helpers
        textColor: bgOpacity > 0.5 ? 'text-white' : (totalSpent > 0 ? 'text-indigo-900' : 'text-slate-400'),
        badgeBg: bgOpacity > 0.5 ? 'bg-white/20 text-white' : 'bg-white/70 text-slate-600 border border-slate-200'
      });
    }

    return { days, startDay, daysInMonth };
  }, [calDate, transactions, subscriptions, bankAccounts, currentCurrency, usdToInrRate]);

  // --- CALENDAR HANDLERS ---
  const handlePrevMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));

  // --- CALENDAR LOGIC END ---

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

  if (loading || isLookupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <ArrowPathIcon className="h-16 w-16 animate-spin text-indigo-600" />
      </div>
    );
  }

  // --- Dynamic Color Generator ---
  // Uses the "Golden Angle" (~137.5 degrees) to generate distinct colors for any number of items
  const getDynamicColor = (index: number) => {
    const hue = (index * 137.5) % 360;
    return `hsl(${hue}, 70%, 55%)`; // Vibrant, distinct colors
  };

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
            <option value="all">All Years</option> {/* All Years option for cumulative view */}
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
          {/* Display Period Income */}
          <h3 className="font-semibold text-slate-500">Total Income ({selectedMonth === 'all' ? 'Year' : 'Month'})</h3>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(periodIncome, currentCurrency, usdToInrRate)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          {/* Display Period Expenses */}
          <h3 className="font-semibold text-slate-500">Total Expenses ({selectedMonth === 'all' ? 'Year' : 'Month'})</h3>
          <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(periodExpenses, currentCurrency, usdToInrRate)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          {/* Display Cumulative Balance */}
          <h3 className="font-semibold text-slate-500">Current Balance (Cumulative)</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{formatCurrency(cumulativeBalance, currentCurrency, usdToInrRate)}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. Spending by Category*/}
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
                  // Use periodExpenses for correct percentage calculation
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
        {/* 2. Spending by Payment Method */}
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
                  // Use periodExpenses for correct percentage calculation
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
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-10">No payment method data for this period.</p>
          )}
        </div>
        {/* 3. Subscriptions Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Subscriptions</h2>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
              {activeSubCount} Active
            </span>
          </div>

          {subscriptions.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptions}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {subscriptions.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getDynamicColor(index)} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value, currentCurrency, usdToInrRate),
                      name
                    ]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
              <p>No active subscriptions</p>
            </div>
          )}
        </div>
        {/* 5. Monthly Spending Bar Chart */}
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
      {/* --- FINANCIAL CALENDAR --- */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-8 w-full mt-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              📅 Financial Calendar
            </h2>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-all">
                <ChevronLeftIcon className="w-5 h-5 text-slate-600" />
              </button>
              <span className="px-4 font-semibold text-slate-700 min-w-[140px] text-center">
                {calDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-all">
                <ChevronRightIcon className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* CATEGORY LEGEND */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 max-w-2xl justify-start md:justify-end">
            {Object.entries(categoryColors).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                <span>{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- DESKTOP VIEW (Grid) --- */}
        <div className="hidden md:block">
          <div className="grid grid-cols-7 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 bg-slate-100 border border-slate-100 gap-px">
            {/* Padding Days */}
            {Array.from({ length: calendarData.startDay }).map((_, i) => (
              <div key={`pad-${i}`} className="h-32 lg:h-40 bg-slate-50/50 border border-slate-100/50"></div>
            ))}

            {/* Calendar Days */}
            {calendarData.days.map((d) => (
              <div
                key={`day-${d.day}`}
                className="relative h-36 lg:h-48 border border-slate-100 p-2 flex flex-col transition-all hover:ring-2 hover:ring-indigo-300 hover:z-10 bg-white group"
              >
                <div className="absolute inset-0 bg-indigo-600 pointer-events-none transition-opacity" style={{ opacity: d.bgOpacity }}></div>
                <div className="relative z-10 flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold ${d.textColor}`}>{d.day}</span>
                  {d.totalSpent > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 rounded-sm backdrop-blur-sm ${d.badgeBg}`}>
                      {formatCurrency(d.totalSpent, currentCurrency, usdToInrRate).replace(/\..*$/, '')}
                    </span>
                  )}
                </div>

                <div className="relative z-10 flex-1 flex flex-col gap-1 overflow-hidden">
                  {(d.daySubs.length > 0 || d.dayAutopays.length > 0) && (
                    <div className="flex flex-col gap-1 mb-1">
                      {d.daySubs.map(sub => (
                        <div key={sub.id} className="bg-purple-100 border border-purple-200 text-purple-700 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1.5 font-medium shadow-sm" title={`Sub: ${sub.name}`}>
                          <ArrowPathIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{sub.name}</span>
                        </div>
                      ))}
                      {d.dayAutopays.map(acc => (
                        <div key={acc.id} className="bg-red-100 border border-red-200 text-red-700 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1.5 font-medium shadow-sm" title={`Autopay: ${acc.bankName}`}>
                          <CreditCardIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{acc.bankName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pt-1">
                    {d.dayTrans.map(t => (
                      <div
                        key={t.id}
                        className="flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded-sm w-full truncate border border-transparent hover:border-slate-300 bg-white/60 hover:bg-white transition-colors cursor-default shadow-sm"
                        title={`${t.description}: ${formatCurrency(t.amount, currentCurrency, usdToInrRate)}`}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: categoryColors[t.category || 'Misc'] || '#94a3b8' }}
                        ></div>
                        <span className="truncate text-slate-700 font-medium">{t.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- MOBILE VIEW (Vertical List) --- */}
        <div className="md:hidden flex flex-col gap-3">
          {calendarData.days.map((d) => (
            <div
              key={`mob-day-${d.day}`}
              className="relative overflow-hidden rounded-lg border border-slate-200 shadow-sm"
            >
              {/* Heatmap Background */}
              <div className="absolute inset-0 bg-indigo-600 pointer-events-none transition-opacity" style={{ opacity: d.bgOpacity }}></div>

              <div className="relative z-10 p-3 bg-white/40 backdrop-blur-[2px]">
                {/* Header Row: Date & Total */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${d.totalSpent > 0 ? 'text-indigo-900' : 'text-slate-500'}`}>
                      {d.dateObj.toLocaleString('en-US', { weekday: 'short' })} {d.day}
                    </span>
                  </div>
                  {d.totalSpent > 0 && (
                    <span className="text-sm font-bold bg-white text-indigo-700 px-2 py-1 rounded shadow-sm">
                      {formatCurrency(d.totalSpent, currentCurrency, usdToInrRate)}
                    </span>
                  )}
                </div>

                {/* Content Area */}
                {(d.daySubs.length > 0 || d.dayAutopays.length > 0 || d.dayTrans.length > 0) ? (
                  <div className="space-y-2">
                    {/* Recurring Items */}
                    {(d.daySubs.length > 0 || d.dayAutopays.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {d.daySubs.map(sub => (
                          <span key={sub.id} className="bg-purple-100 border border-purple-200 text-purple-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium shadow-sm">
                            <ArrowPathIcon className="w-3 h-3" />
                            {sub.name}
                          </span>
                        ))}
                        {d.dayAutopays.map(acc => (
                          <span key={acc.id} className="bg-red-100 border border-red-200 text-red-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium shadow-sm">
                            <CreditCardIcon className="w-3 h-3" />
                            {acc.bankName}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Transactions List */}
                    {d.dayTrans.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {d.dayTrans.map(t => (
                          <div
                            key={t.id}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white border border-slate-200 shadow-sm"
                          >
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: categoryColors[t.category || 'Misc'] || '#94a3b8' }}
                            ></div>
                            <span className="font-medium text-slate-700">{t.description}</span>
                            <span className="text-slate-400 border-l pl-1 ml-1">
                              {formatCurrency(t.amount, currentCurrency, usdToInrRate).replace(/\..*$/, '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No activity</div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

export default Dashboard;