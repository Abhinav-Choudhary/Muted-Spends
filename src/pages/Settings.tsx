import { useState } from 'react';
import SettingsPage from '../components/SettingsPage';
import MigrationTool from '../components/MigrationTool'; // NEW Import

interface SettingsProps {
  showToast: (message: string, type: 'income' | 'expense') => void;
}

const Settings: React.FC<SettingsProps> = ({ showToast }) => {
  // MODIFIED: Added 'migration' to the activeTab union type
  const [activeTab, setActiveTab] = useState<'categories' | 'paymentMethods' | 'migration'>('categories');

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200">
      <h2 className="text-xl font-bold mb-6 text-slate-800">App Settings</h2>
      
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'categories' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('paymentMethods')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'paymentMethods' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
        >
          Payment Methods
        </button>
        {/* NEW: Migration Tool Tab */}
        <button
          onClick={() => setActiveTab('migration')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'migration' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
        >
          Migration Tool
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'categories' && (
          <SettingsPage 
            lookupType="categories" 
            title="Manage Expense Categories" 
            nameLabel="Category Name" 
            showToast={showToast} 
          />
        )}
        {activeTab === 'paymentMethods' && (
          <SettingsPage 
            lookupType="paymentMethods" 
            title="Manage Payment Methods" 
            nameLabel="Method Name" 
            showToast={showToast} 
          />
        )}
        {/* NEW: Render Migration Tool Component */}
        {activeTab === 'migration' && (
            <MigrationTool showToast={showToast} />
        )}
      </div>
    </div>
  );
};

export default Settings;