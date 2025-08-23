import { useState, useEffect } from 'react';
import { listenToAuth, signInWithGoogle, signOutUser } from '../services/firebaseService';
import Sidebar from './Sidebar';
import Dashboard from '../pages/Dashboard';
import Transactions from '../pages/Transactions';
import AddTransaction from '../pages/AddTransaction';
import Converter from '../pages/Converter';
import type { User as FirebaseUser } from 'firebase/auth';

const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const App = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  const handleSignIn = () => {
    signInWithGoogle();
  };

  const handleSignOut = () => {
    signOutUser();
    setActivePage('dashboard');
  };

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setIsSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <Transactions />;
      case 'add':
        return <AddTransaction />;
      case 'converter':
        return <Converter />;
      default:
        return <Dashboard />;
    }
  };

  // If the user is not signed in, render the standalone login page.
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center max-w-sm mx-auto">
          <img src="/icons/favicon-500x500.png" alt="Muted Spends Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Muted Spends</h1>
          <p className="text-slate-600 mb-6">Sign in to track your spending, view insights, and manage your budget effortlessly.</p>
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

  // If the user is signed in, render the main application layout.
  return (
    <div className="relative flex h-screen bg-slate-100">
      <Sidebar
        user={user}
        onPageChange={handlePageChange}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300 ease-in-out overflow-y-auto custom-scrollbar">
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
            {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
          </h1>
        </header>
        <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto custom-scrollbar">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;