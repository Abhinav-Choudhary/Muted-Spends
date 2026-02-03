import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import {
  listenToAuth, signInWithGoogle, signOutUser, type Transaction,
  checkAndProcessSubscriptions
} from '../services/firebaseService';
import Sidebar from './Sidebar';
import Dashboard from '../pages/Dashboard';
import Transactions from '../pages/Transactions';
import AddTransaction from '../pages/AddTransaction';
import Converter from '../pages/Converter';
import Export from '../pages/Export';
import Subscriptions from '../pages/Subscriptions';
import BankAccounts from '../pages/BankAccounts';
import EditTransactionModal from './EditTransactionModal';
import Toast from './Toast';
import { useCurrency } from '../context/CurrencyContext';
import type { User as FirebaseUser } from 'firebase/auth';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import Settings from '../pages/Settings';

// --- Reusable Google Icon Component ---
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

interface ToastMessage {
  id: number;
  message: string;
  type: 'income' | 'expense';
}

const App = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const location = useLocation();
  const { currentCurrency, handleCurrencyToggle } = useCurrency();
  const hasCheckedSubs = useRef(false);

  const getPageTitle = (pathname: string) => {
    const page = pathname.replace('/', '');
    if (!page || page === 'dashboard') return 'Dashboard';
    if (page === 'add') return 'Add Transaction';
    if (page === 'settings') return 'Settings';
    return page.charAt(0).toUpperCase() + page.slice(1);
  };

  useEffect(() => {
    const unsubscribe = listenToAuth(async (user) => {
      setUser(user);
      setLoading(false);

      // LOGIC: Only run if user exists AND we haven't run it yet
      if (user && !hasCheckedSubs.current) {
        hasCheckedSubs.current = true; // <--- LOCK IT IMMEDIATELY

        try {
          const count = await checkAndProcessSubscriptions(user.uid);
          if (count > 0) showToast(`Processed ${count} recurring subscriptions`, 'expense');
        } catch (e) {
          console.error("Error processing subscriptions", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = listenToAuth(async (user) => {
      setUser(user);
      setLoading(false);

      // NEW: Run the "Free" Automation
      if (user) {
        try {
          const processedCount = await checkAndProcessSubscriptions(user.uid);
          if (processedCount > 0) {
            showToast(`Added ${processedCount} recurring subscriptions.`, 'income');
          }
        } catch (e) {
          console.error("Error processing subscriptions", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = listenToAuth(async (user) => {
      setUser(user);
      setLoading(false);
      // Run Automation Check
      if (user) {
        const count = await checkAndProcessSubscriptions(user.uid);
        if (count > 0) console.log(`Processed ${count} recurring subscriptions`, 'expense');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleCloseModal = () => {
    setEditingTransaction(null);
  };

  const handleSignIn = () => {
    signInWithGoogle().catch(err => console.error("Sign-in error", err));
  };

  const handleSignOut = () => {
    signOutUser();
  };

  const showToast = (message: string, type: 'income' | 'expense') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <ArrowPathIcon className="h-16 w-16 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center max-w-sm w-full mx-auto">
          <img src="/icons/favicon-500x500.png" alt="Muted Spends Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Muted Spends</h1>
          <p className="text-slate-600 mb-8">Sign in to track your spending and manage your budget.</p>
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <GoogleIcon />
            <span>Sign In with Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-slate-100 overflow-hidden">
      <div className={`flex h-full ${editingTransaction ? 'filter blur-sm pointer-events-none' : ''}`}>
        <Sidebar
          user={user}
          onSignOut={handleSignOut}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300 ease-in-out">
          <header className="flex items-center gap-4 p-6 sm:p-8 lg:p-10 bg-slate-100">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-indigo-600 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-slate-900 flex-grow">
              {getPageTitle(location.pathname)}
            </h1>
            <div className="flex items-center gap-2 text-sm font-medium ml-auto">
              <span className={`${currentCurrency === 'USD' ? 'text-indigo-600' : 'text-slate-400'}`}>USD</span>
              <label className="switch relative inline-block w-12 h-6">
                <input type="checkbox" className="opacity-0 w-0 h-0" checked={currentCurrency === 'INR'} onChange={handleCurrencyToggle} />
                <span className="slider absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full transition-colors duration-200 before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:duration-200"></span>
              </label>
              <span className={`${currentCurrency === 'INR' ? 'text-indigo-600' : 'text-slate-400'}`}>INR</span>
            </div>
          </header>
          <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions onEdit={handleEditTransaction} showToast={showToast} />} />
              <Route path="/add" element={<AddTransaction showToast={showToast} />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/accounts" element={<BankAccounts />} />
              <Route path="/converter" element={<Converter />} />
              <Route path="/export" element={<Export />} />
              <Route path="/settings" element={<Settings showToast={showToast} />} />
            </Routes>
          </main>
        </div>
      </div>

      <EditTransactionModal
        transaction={editingTransaction}
        onClose={handleCloseModal}
        onSave={() => {
          handleCloseModal();
          showToast('Transaction updated successfully!', 'income');
        }}
      />

      <div className="absolute bottom-4 right-4 z-[100] w-full max-w-xs sm:max-w-sm">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default App;