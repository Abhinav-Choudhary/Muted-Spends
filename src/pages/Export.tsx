import { useState } from 'react';
import { listenToTransactions } from '../services/firebaseService';
import * as XLSX from 'xlsx';
import { formatTimestampForExport } from '../utils/helpers';

const Export: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    // Listen to all transactions, without filtering by date
    const unsubscribe = listenToTransactions((transactions) => {
      if (transactions.length > 0) {
        const dataToExport = transactions.map(t => ({
          Date: formatTimestampForExport(t.timestamp),
          Description: t.description,
          Amount: t.amount,
          Type: t.type,
          Category: t.category || '',
          'Payment Method': t.paymentMethod || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        XLSX.writeFile(workbook, 'MutedSpends_Transactions.xlsx');
      }
      setLoading(false);
      unsubscribe(); // Unsubscribe after fetching the data
    }, 'all', 'all');
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold mb-4">Export Transactions</h2>
      <p className="text-sm text-slate-500 mb-6">Download all your transaction data as an Excel file (.xlsx).</p>
      <button
        onClick={handleExport}
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
      >
        {loading ? 'Preparing Data...' : 'Download All Transactions'}
      </button>
    </div>
  );
};

export default Export;
