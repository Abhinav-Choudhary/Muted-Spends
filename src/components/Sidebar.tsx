import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
// MODIFIED: Imported DocumentArrowDownIcon
import { HomeIcon, CurrencyDollarIcon, PlusIcon, BoltIcon, ArrowRightEndOnRectangleIcon, DocumentArrowDownIcon, Cog8ToothIcon } from '@heroicons/react/24/solid';
import type { User as FirebaseUser } from 'firebase/auth';

interface SidebarProps {
  user: FirebaseUser | null;
  onSignOut: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onSignOut, isSidebarOpen, setIsSidebarOpen }) => {
  const sidebarRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSidebarOpen, setIsSidebarOpen]);

  const getLinkClass = (path: string) => {
    const currentPath = location.pathname === '/' ? '/dashboard' : location.pathname;
    return `flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer ${currentPath === path
        ? 'bg-indigo-100 text-indigo-600 font-semibold'
        : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
      }`;
  };

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
            <Link to="/dashboard" className={getLinkClass('/dashboard')} onClick={() => setIsSidebarOpen(false)}>
              <HomeIcon className="w-5 h-5" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/transactions" className={getLinkClass('/transactions')} onClick={() => setIsSidebarOpen(false)}>
              <CurrencyDollarIcon className="w-5 h-5" />
              Transactions
            </Link>
          </li>
          <li>
            <Link to="/add" className={getLinkClass('/add')} onClick={() => setIsSidebarOpen(false)}>
              <PlusIcon className="w-5 h-5" />
              Add Transaction
            </Link>
          </li>
          <li>
            <Link to="/converter" className={getLinkClass('/converter')} onClick={() => setIsSidebarOpen(false)}>
              <BoltIcon className="w-5 h-5" />
              Converter
            </Link>
          </li>
          <li>
            <Link to="/export" className={getLinkClass('/export')} onClick={() => setIsSidebarOpen(false)}>
              <DocumentArrowDownIcon className="w-5 h-5" />
              Export Data
            </Link>
          </li>
          <li>
            <Link to="/settings" className={getLinkClass('/settings')} onClick={() => setIsSidebarOpen(false)}>
              <Cog8ToothIcon className="w-5 h-5" />
              Settings
            </Link>
          </li>
        </ul>

        <div className="mt-auto">
          {user && (
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
          )}
        </div>
      </nav>
      {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
    </>
  );
};

export default Sidebar;
