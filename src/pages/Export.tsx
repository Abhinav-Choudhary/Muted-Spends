import { useState, useEffect } from 'react';
import { listenToTransactions, type Transaction } from '../services/firebaseService';
import { exportTransactionsToExcel } from '../utils/exportHelper';

const Export: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch ALL transactions on mount
  useEffect(() => {
    const unsubscribe = listenToTransactions((data) => {
      setTransactions(data);
      setDataLoaded(true);
    }, 'all', 'all');
    return () => unsubscribe();
  }, []);

  const handleExport = async () => {
    if (transactions.length === 0) {
      alert("No transactions to export!");
      return;
    }

    setLoading(true);
    try {
      // Generate dynamic filename: MutedSpends-DD-MM-YYYY
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const fileName = `MutedSpends-${day}-${month}-${year}`;

      await exportTransactionsToExcel(transactions, fileName);
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold mb-4">Export Transactions</h2>
      <p className="text-sm text-slate-500 mb-6">
        {dataLoaded
          ? `Ready to export ${transactions.length} transactions.`
          : 'Loading your transaction history...'}
      </p>

      <button
        onClick={handleExport}
        disabled={loading || !dataLoaded || transactions.length === 0}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Generating Excel File...' : 'Download All Transactions (.xlsx)'}
      </button>
    </div>
  );
};

export default Export;