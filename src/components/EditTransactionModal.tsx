import { useState, useEffect } from 'react';
import { updateTransaction, uploadReceipt, type Transaction } from '../services/firebaseService';
import { formatTimestampForInput } from '../utils/helpers'; // Ensure this helper is imported
import { Timestamp } from 'firebase/firestore';
import Modal from './Modal';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, onClose, onSave }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      // MODIFIED: Use the correct helper function to format the date for the input
      setDate(formatTimestampForInput(transaction.timestamp));
      if (transaction.type === 'expense') {
        setCategory(transaction.category || 'Groceries');
        setPaymentMethod(transaction.paymentMethod || 'Amex Credit Card');
        setExistingReceiptUrl(transaction.receiptUrl || null);
      }
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let receiptUrl = existingReceiptUrl || '';

    try {
      if (receipt) {
        receiptUrl = await uploadReceipt(receipt);
      }
      
      // Use the local date string directly to create the new date
      const localDate = new Date(date + 'T00:00:00');

      const updatedData: Partial<Transaction> = {
        description,
        amount: parseFloat(amount),
        timestamp: Timestamp.fromDate(localDate),
        category: transaction.type === 'expense' ? category : '',
        paymentMethod: transaction.type === 'expense' ? paymentMethod : '',
        receiptUrl,
      };

      await updateTransaction(transaction.id, updatedData);
      onSave();
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Failed to update transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={!!transaction} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label htmlFor="edit-description" className="block text-sm font-medium text-slate-700">Description</label>
          <input id="edit-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label htmlFor="edit-amount" className="block text-sm font-medium text-slate-700">Amount</label>
          <input id="edit-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label htmlFor="edit-date" className="block text-sm font-medium text-slate-700">Date</label>
          <input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        {transaction.type === 'expense' && (
          <>
            <div>
              <label htmlFor="edit-category" className="block text-sm font-medium text-slate-700">Category</label>
              <select id="edit-category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option>Groceries</option>
                <option>Dining</option>
                <option>Travel</option>
                <option>Rent</option>
                <option>Bills</option>
                <option>Misc</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-paymentMethod" className="block text-sm font-medium text-slate-700">Payment Method</label>
              <select id="edit-paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
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
                <input type="file" id="receipt" onChange={(e) => setReceipt(e.target.files ? e.target.files[0] : null)} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                {existingReceiptUrl && <a href={existingReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">View current receipt</a>}
            </div>
          </>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTransactionModal;
