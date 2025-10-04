import React, { useState } from 'react';
import { runMigrationBatch } from '../services/firebaseService';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface MigrationToolProps {
  showToast: (message: string, type: 'income' | 'expense') => void;
}

const MigrationTool: React.FC<MigrationToolProps> = ({ showToast }) => {
    
  const [fieldToMigrate, setFieldToMigrate] = useState<'category' | 'paymentMethod'>('category');
  const [oldMigrationName, setOldMigrationName] = useState('');
  const [newMigrationName, setNewMigrationName] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  
  const fieldNameLabel = fieldToMigrate === 'category' ? 'Category' : 'Payment Method';
    
  const handleManualMigration = async () => {
    if (!oldMigrationName || !newMigrationName) {
        alert("Please enter both the old and new names for migration.");
        return;
    }
    
    if (oldMigrationName === newMigrationName) {
        alert("Old name and new name must be different.");
        return;
    }
    
    if (!window.confirm(`Are you sure you want to change ALL transactions currently labeled "${oldMigrationName}" to "${newMigrationName}"? This cannot be undone easily.`)) {
        return;
    }

    setIsMigrating(true);
    try {
        const migratedCount = await runMigrationBatch(
            fieldToMigrate,
            oldMigrationName,
            newMigrationName
        );
        showToast(`Migration complete: Updated ${migratedCount} transaction(s).`, migratedCount > 0 ? 'income' : 'expense');
        setOldMigrationName('');
        setNewMigrationName('');
    } catch (error) {
        console.error("Migration failed:", error);
        showToast("Migration failed. Check console for details.", 'expense');
    } finally {
        setIsMigrating(false);
    }
  };

  return (
    <div className="p-6 border border-yellow-300 bg-yellow-50 rounded-xl space-y-4 max-w-xl mx-auto">
      <h3 className="text-xl font-bold text-yellow-800 flex items-center gap-3">
        <WrenchScrewdriverIcon className="h-6 w-6" />
        Bulk Data Migration Tool
      </h3>
      <p className="text-sm text-yellow-700">
        Use this tool after renaming an item in a list (e.g., changing "Old Bills" to "Utility Bills") to update all existing transactions that still refer to the **Old Name**.
      </p>

      <div className="space-y-4">
        <div>
            <label htmlFor="field-select" className="block text-sm font-medium text-slate-700">Type of Field to Update</label>
            <select
                id="field-select"
                value={fieldToMigrate}
                onChange={(e) => setFieldToMigrate(e.target.value as 'category' | 'paymentMethod')}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
                <option value="category">Category</option>
                <option value="paymentMethod">Payment Method</option>
            </select>
        </div>

        <div className="flex gap-3">
            <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">Old {fieldNameLabel} Name (Current in transactions)</label>
                <input
                    type="text"
                    value={oldMigrationName}
                    onChange={(e) => setOldMigrationName(e.target.value)}
                    placeholder={`e.g., ${fieldToMigrate === 'category' ? 'Groceries-D2' : 'Amex-Old'}`}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">New {fieldNameLabel} Name (Correct in lookups)</label>
                <input
                    type="text"
                    value={newMigrationName}
                    onChange={(e) => setNewMigrationName(e.target.value)}
                    placeholder={`e.g., ${fieldToMigrate === 'category' ? 'Groceries' : 'Amex-New'}`}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
        </div>

        <button
            onClick={handleManualMigration}
            disabled={isMigrating || !oldMigrationName || !newMigrationName || oldMigrationName === newMigrationName}
            className="w-full flex items-center justify-center gap-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-yellow-400"
        >
            {isMigrating ? (
                <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Migrating...
                </>
            ) : 'Run Migration'}
        </button>
      </div>
    </div>
  );
};

export default MigrationTool;