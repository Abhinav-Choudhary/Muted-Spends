import { useEffect, useRef } from 'react';
import { HomeIcon, CurrencyDollarIcon, PlusIcon, BoltIcon, ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/solid';
import type { User as FirebaseUser } from 'firebase/auth';

interface SidebarProps {
  user: FirebaseUser | null;
  onPageChange: (page: string) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onPageChange, onSignIn, onSignOut, isSidebarOpen, setIsSidebarOpen }) => {
  const sidebarRef = useRef<HTMLElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSidebarOpen, setIsSidebarOpen]);

  return (
    <>
      <nav
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 p-4 transform transition-transform duration-300 ease-in-out z-50 flex flex-col 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 mb-10 px-2">
          <img src="/icons/favicon-500x500.png" alt="Muted Spends Logo" className="w-10 h-10" />
          <span className="font-bold text-xl text-slate-800">Muted Spends</span>
        </div>

        <ul className="space-y-2">
          <li>
            <a onClick={() => onPageChange('dashboard')} className="nav-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer">
              <HomeIcon className="w-5 h-5" />
              Dashboard
            </a>
          </li>
          <li>
            <a onClick={() => onPageChange('transactions')} className="nav-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer">
              <CurrencyDollarIcon className="w-5 h-5" />
              Transactions
            </a>
          </li>
          <li>
            <a onClick={() => onPageChange('add')} className="nav-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer">
              <PlusIcon className="w-5 h-5" />
              Add Transaction
            </a>
          </li>
          <li>
            <a onClick={() => onPageChange('converter')} className="nav-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer">
              <BoltIcon className="w-5 h-5" />
              Converter
            </a>
          </li>
        </ul>

        <div className="mt-auto">
          {user ? (
            <div className="flex items-center gap-3 p-2 rounded-lg">
              <img className="w-10 h-10 rounded-full" src={user.photoURL || 'https://placehold.co/40x40/E2E8F0/1E293B?text=U'} alt="User photo" />
              <div>
                <p className="font-semibold text-sm text-slate-800">{user.displayName || 'User'}</p>
                <button onClick={onSignOut} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1">
                  <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="w-full bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </nav>
      {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
    </>
  );
};

export default Sidebar;