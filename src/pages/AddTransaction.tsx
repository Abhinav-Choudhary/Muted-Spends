import { useState, useEffect } from 'react'; // Added useEffect import
import { addTransaction, uploadReceipt, type AddTransactionData } from '../services/firebaseService';
import { useLookups } from '../context/LookupContext'; // NEW Import
import { ArrowPathIcon } from '@heroicons/react/24/solid';

interface AddTransactionProps {
  showToast: (message: string, type: 'income' | 'expense') => void;
}

const AddTransaction: React.FC<AddTransactionProps> = ({ showToast }) => {
  const [activeForm, setActiveForm] = useState<'income' | 'expense'>('expense');
  // MODIFIED: Use default names and loading status from context
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

  // Synchronize internal state with context defaults when they load or change
  useEffect(() => {
    setCategory(defaultCategoryName);
    setPaymentMethod(defaultPaymentMethodName);
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
