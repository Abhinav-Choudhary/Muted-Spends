import { useState, useEffect } from 'react';
import { addTransaction, uploadReceipt, type AddTransactionData } from '../services/firebaseService';
import { analyzeReceipt } from '../services/aiService';
import { useLookups } from '../context/LookupContext';
import { ArrowPathIcon, CameraIcon } from '@heroicons/react/24/solid';

interface AddTransactionProps {
  showToast: (message: string, type: 'income' | 'expense') => void;
}

const AddTransaction: React.FC<AddTransactionProps> = ({ showToast }) => {
  const [activeForm, setActiveForm] = useState<'income' | 'expense'>('expense');
  // Use default names and loading status from context
  const { categories, paymentMethods, defaultCategoryName, defaultPaymentMethodName, isLookupsLoading } = useLookups();

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const adjustedDate = new Date(now.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  }

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDate());
  // Set initial state to fallback or default if available.
  const [category, setCategory] = useState('Misc');
  const [paymentMethod, setPaymentMethod] = useState('Other');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Synchronize internal state with context defaults when they load or change
  useEffect(() => {
    setCategory(defaultCategoryName);
    setPaymentMethod(defaultPaymentMethodName);
    // debugAvailableModels();
  }, [defaultCategoryName, defaultPaymentMethodName]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    // Reset to dynamic default values
    setCategory(defaultCategoryName);
    setPaymentMethod(defaultPaymentMethodName);
    setReceipt(null);
    // This will clear the file input visually
    const fileInput = document.getElementById('receipt') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) {
      alert('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    let receiptUrl = '';

    try {
      if (receipt) {
        receiptUrl = await uploadReceipt(receipt);
      }

      const transactionData: AddTransactionData = {
        description,
        amount: parseFloat(amount),
        date,
        type: activeForm,
        category: activeForm === 'expense' ? category : '',
        paymentMethod: activeForm === 'expense' ? paymentMethod : '',
        receiptUrl,
      };

      await addTransaction(transactionData);

      // MODIFIED: Show toast instead of navigating
      showToast(
        activeForm === 'income' ? 'Income added successfully!' : 'Expense added successfully!',
        activeForm === 'income' ? 'income' : 'expense'
      );
      resetForm();

    } catch (error) {
      console.error("Error saving transaction:", error);
      showToast('Failed to save transaction.', 'expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set the file for upload later
    setReceipt(file);
    setIsScanning(true);

    try {
      // Pass the user's categories and payment methods to the AI
      const categoryNames = categories.map(c => c.name);
      const paymentNames = paymentMethods.map(p => p.name);

      const data = await analyzeReceipt(file, categoryNames, paymentNames);

      // Auto-fill form
      if (data.amount) setAmount(data.amount.toString());
      if (data.date) setDate(data.date);
      if (data.description) setDescription(data.description);
      if (data.category && categoryNames.includes(data.category)) setCategory(data.category);
      if (data.paymentMethod && paymentNames.includes(data.paymentMethod)) setPaymentMethod(data.paymentMethod);

      showToast('Receipt scanned & applied!', 'expense');
    } catch (error) {
      console.error(error);
      showToast('Failed to analyze receipt', 'expense');
    } finally {
      setIsScanning(false);
    }
  };

  if (isLookupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <ArrowPathIcon className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-6">Add New Transaction</h2>

      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveForm('expense')}
          className={`px-4 py-2 text-sm font-medium ${activeForm === 'expense' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
        >
          Expense
        </button>
        <button
          onClick={() => setActiveForm('income')}
          className={`px-4 py-2 text-sm font-medium ${activeForm === 'income' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
        >
          Income
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Scan Receipt (AI)</label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200">
              {isScanning ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <span className="font-medium">{isScanning ? 'Analyzing...' : 'Upload & Scan'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReceiptScan}
              />
            </label>
            {receipt && <span className="text-sm text-green-600">File attached</span>}
          </div>
        </div> */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            {activeForm === 'income' ? 'Source' : 'Description'}
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700">Amount</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
            step="0.01"
          />
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        {activeForm === 'expense' && (
          <>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700">Payment Method</label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {paymentMethods.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-center justify-between transition-all">
              <div className="text-sm text-indigo-800">
                <span className="font-semibold block">Have a receipt?</span>
                Scan it to auto-fill details.
              </div>
              <label className="cursor-pointer flex items-center gap-2 bg-white px-3 py-2 rounded-md border border-indigo-200 text-indigo-600 font-medium hover:bg-indigo-50 shadow-sm transition-all">
                {isScanning ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CameraIcon className="w-5 h-5" />}
                <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleReceiptScan} disabled={isScanning} />
              </label>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
        >
          {isSubmitting ? 'Adding...' : `Add ${activeForm.charAt(0).toUpperCase() + activeForm.slice(1)}`}
        </button>
      </form>
    </div>
  );
};

export default AddTransaction;
