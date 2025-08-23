import { useState } from 'react';
import { addTransaction, uploadReceipt, type AddTransactionData } from '../services/firebaseService';

interface AddTransactionProps {
  showToast: (message: string, type: 'income' | 'expense') => void;
}

const AddTransaction: React.FC<AddTransactionProps> = ({ showToast }) => {
  const [activeForm, setActiveForm] = useState<'income' | 'expense'>('expense');
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Groceries');
  const [paymentMethod, setPaymentMethod] = useState('Amex Credit Card');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Groceries');
    setPaymentMethod('Amex Credit Card');
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
                <option>Groceries</option>
                <option>Dining</option>
                <option>Travel</option>
                <option>Rent</option>
                <option>Bills</option>
                <option>Misc</option>
              </select>
            </div>
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700">Payment Method</label>
               <select
                id="payment-method"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option>Amex Credit Card</option>
                <option>Zolve Mastercard</option>
                <option>Debit Card</option>
                <option>Apple Cash</option>
                <option>Venmo</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="receipt" className="block text-sm font-medium text-slate-700">Receipt (Optional)</label>
              <input
                type="file"
                id="receipt"
                onChange={(e) => setReceipt(e.target.files ? e.target.files[0] : null)}
                className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
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
