import React, { useState } from 'react';
import { useLookups } from '../context/LookupContext';
import { addLookupItem, updateLookupItem, deleteLookupItem, type LookupItem } from '../services/firebaseService';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, StarIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface SettingsPageProps {
  lookupType: 'categories' | 'paymentMethods';
  title: string;
  nameLabel: string;
  showToast: (message: string, type: 'income' | 'expense') => void;
}

// MODIFIED: Use the extended LookupItem with isDefault field
interface LookupItemExtended extends LookupItem {
  isDefault: boolean;
}

// Utility component for display consistency (similar to TagDisplay in Transactions)
const ColorTag = ({ color, name }: { color: string, name: string }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
    <span className="font-medium text-slate-800 truncate">{name}</span>
  </div>
);

const SettingsPage: React.FC<SettingsPageProps> = ({ lookupType, title, nameLabel, showToast }) => {
  const { categories, paymentMethods, isLookupsLoading } = useLookups();
  const currentLookups = lookupType === 'categories' ? categories : paymentMethods;

  const [newItemName, setNewItemName] = useState('');
  const [newItemColor, setNewItemColor] = useState('#ffe600');
  const [newItemIsDefault, setNewItemIsDefault] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [editingIsDefault, setEditingIsDefault] = useState(false);


  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemColor) {
      alert('Please provide both name and color.');
      return;
    }
    if (currentLookups.some(item => item.name.toLowerCase() === newItemName.toLowerCase())) {
      alert(`A ${nameLabel} with that name already exists.`);
      return;
    }

    setIsAdding(true);
    try {
      await addLookupItem(lookupType, { name: newItemName, color: newItemColor, isDefault: newItemIsDefault });
      showToast(`${nameLabel} added successfully!`, 'income');
      setNewItemName('');
      setNewItemColor('#ffe600');
      setNewItemIsDefault(false);
    } catch (error) {
      console.error("Error adding lookup item:", error);
      showToast(`Failed to add ${nameLabel}.`, 'expense');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (item: LookupItemExtended) => {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingColor(item.color);
    setEditingIsDefault(item.isDefault);
  };

  const handleSaveEdit = async (item: LookupItemExtended) => {
    if (!editingName || !editingColor) return alert('Name and color cannot be empty.');

    // Check if the new name conflicts with an existing one (excluding the item being edited)
    if (currentLookups.some(i => i.name.toLowerCase() === editingName.toLowerCase() && i.id !== item.id)) {
      alert(`A ${nameLabel} with that name already exists.`);
      return;
    }

    // Only update if something actually changed
    if (editingName === item.name && editingColor === item.color && editingIsDefault === item.isDefault) {
      setEditingId(null);
      return;
    }

    try {
      await updateLookupItem(lookupType, item.id, { name: editingName, color: editingColor, isDefault: editingIsDefault });
      showToast(`${nameLabel} updated successfully!`, 'income');
      setEditingId(null);

      // NEW: Show a reminder toast after saving a name change
      if (editingName !== item.name) {
        showToast(`Remember to run the Migration Tool for historical transactions.`, 'income');
      }
    } catch (error) {
      console.error("Error updating lookup item:", error);
      showToast(`Failed to update ${nameLabel}.`, 'expense');
    }
  };

  const handleDelete = async (item: LookupItemExtended) => {
    if (!window.confirm(`Are you sure you want to delete the ${nameLabel} "${item.name}"?`)) {
      return;
    }

    try {
      await deleteLookupItem(lookupType, item.id, item.name);
      showToast(`${nameLabel} deleted successfully.`, 'expense');
    } catch (error) {
      console.error("Error deleting lookup item:", error);
      // Display the restricted delete error message from the service
      if (error instanceof Error && error.message.includes("Cannot delete")) {
        alert(error.message);
      } else {
        showToast(`Failed to delete ${nameLabel}.`, 'expense');
      }
    }
  };

  // Function to handle setting a default directly via button
  const handleSetDefault = async (item: LookupItemExtended) => {
    if (item.isDefault) return; // Already default

    try {
      // Set this item as default. The service handles clearing the old default.
      await updateLookupItem(lookupType, item.id, { isDefault: true });
      showToast(`Set "${item.name}" as the new default.`, 'income');
    } catch (error) {
      console.error("Error setting default:", error);
      showToast(`Failed to set "${item.name}" as default.`, 'expense');
    }
  };

  if (isLookupsLoading) {
    return <div className="flex justify-center py-10"><ArrowPathIcon className="h-10 w-10 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-8">

      {/* MODIFIED: Added helper text/tooltip next to the title */}
      <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
        {title}
        <span
          title="If you rename an item, historical transactions will still use the old name string. Use the 'Migration Tool' tab to fix them in bulk."
          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </span>
      </h3>

      {/* Add New Item Form - FIX: Changed min-w-[150px] to min-w-0 on line 87 to be responsive */}
      {/* Container is always responsive, using space-y-4 for mobile and md:space-y-0 for desktop row structure */}
      <form onSubmit={handleAdd} className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4 p-4 border border-indigo-200 bg-indigo-50 rounded-lg">

        {/* Category Name (Full width on mobile, takes 2/3 of space on desktop) */}
        {/* Added md:flex-grow md:max-w-[66%] to give it proportional width on desktop */}
        <div className="w-full md:flex-grow md:max-w-[66%]">
          <label htmlFor={`new-name-${lookupType}`} className="block text-xs font-medium text-slate-700">{nameLabel}</label>
          <input
            id={`new-name-${lookupType}`}
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder={`Enter new ${nameLabel}`}
            required
          />
        </div>

        {/* This block handles Color, Set Default, and Add Button */}
        {/* On mobile, this will break to a new line and use flex for internal alignment (as before).
            On desktop, this continues the main flex row, setting up the remaining horizontal layout. */}
        <div className="flex items-end justify-between gap-4 md:flex-grow md:max-w-[34%]">

          {/* Color Input (Stack on mobile, but align horizontally on desktop) */}
          {/* Removed the fixed w-16 and replaced with a responsive max-w and flex-shrink-0 */}
          <div className="flex-shrink-0 max-w-[50px] sm:max-w-[80px] w-full">
            <label htmlFor={`new-color-${lookupType}`} className="block text-xs font-medium text-slate-700">Color</label>
            <input
              id={`new-color-${lookupType}`}
              type="color"
              value={newItemColor}
              onChange={(e) => setNewItemColor(e.target.value)}
              className="mt-1 w-full h-10 border border-slate-300 rounded-md cursor-pointer"
            />
          </div>

          {/* Is Default Checkbox (Flexible positioning in the middle) */}
          {/* Added md:mb-1 to vertically center it with the buttons/inputs */}
          <div className="flex items-center h-10 mb-1 flex-shrink-0 md:mb-0">
            <input
              id={`new-default-${lookupType}`}
              type="checkbox"
              checked={newItemIsDefault}
              onChange={(e) => setNewItemIsDefault(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor={`new-default-${lookupType}`} className="ml-2 text-sm font-medium text-slate-700">Set Default</label>
          </div>

          {/* Add Button (Always aligned to the right/end) */}
          <button
            type="submit"
            disabled={isAdding}
            className="flex items-center justify-center gap-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 h-10 flex-shrink-0"
          >
            <PlusIcon className="h-5 w-5" />
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

      {/* --- DESKTOP VIEW (Table) --- */}
      {/* ADDED: hidden md:block to hide the table on mobile */}
      <div className="hidden md:block overflow-x-auto shadow-lg rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {/* Resetting back to default px-6 padding and nowrap for desktop layout */}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{nameLabel}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Color</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Default</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {currentLookups.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                {editingId === item.id ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <input
                        type="color"
                        value={editingColor}
                        onChange={(e) => setEditingColor(e.target.value)}
                        className="w-10 h-6 border border-slate-300 rounded-md cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <input
                        type="checkbox"
                        checked={editingIsDefault}
                        onChange={(e) => setEditingIsDefault(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        disabled={item.isDefault && currentLookups.filter(i => !i.isDefault).length === 0}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                      <button
                        onClick={() => handleSaveEdit(item as LookupItemExtended)}
                        className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-100"
                        title="Save"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100"
                        title="Cancel"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        ></span>
                        <span>{item.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {item.isDefault ? (
                        <StarIcon className="h-5 w-5 text-yellow-500" title="Current Default" />
                      ) : (
                        <button
                          onClick={() => handleSetDefault(item as LookupItemExtended)}
                          className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold hover:bg-indigo-50 py-1 px-2 rounded"
                          title="Set as Default"
                        >
                          Set Default
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(item as LookupItemExtended)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-100"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item as LookupItemExtended)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {currentLookups.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  No {lookupType} found. Add your first entry above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE VIEW (Stacked List) --- */}
      {/* ADDED: md:hidden to show this list ONLY on mobile */}
      <div className="md:hidden divide-y divide-slate-200 shadow-lg rounded-xl border border-slate-200">
        {currentLookups.length > 0 ? (
          currentLookups.map((item) => (
            <div key={item.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
              {editingId === item.id ? (
                /* Mobile Edit View (Stacked form for readability) */
                <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(item as LookupItemExtended); }} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">{nameLabel}</label>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500">Color</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={editingColor}
                          onChange={(e) => setEditingColor(e.target.value)}
                          className="w-10 h-8 border border-slate-300 rounded-md cursor-pointer"
                        />
                        <span className="text-sm text-slate-600">{editingColor}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingIsDefault}
                        onChange={(e) => setEditingIsDefault(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        disabled={item.isDefault && currentLookups.filter(i => !i.isDefault).length === 0}
                      />
                      <label className="text-sm font-medium text-slate-700">Set Default</label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="text-sm flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                      title="Save"
                    >
                      <CheckIcon className="h-4 w-4" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                      title="Cancel"
                    >
                      <XMarkIcon className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Mobile View Mode (Row layout with primary info left, actions right) */
                <div className="flex justify-between items-center">
                  {/* Left side: Name and Color code */}
                  <div className="flex flex-col space-y-1">
                    <ColorTag color={item.color} name={item.name} />
                    <span className="text-xs text-slate-500 ml-5">{item.color}</span>
                  </div>

                  {/* Right side: Default status and Actions */}
                  <div className="flex items-center gap-3">
                    {item.isDefault ? (
                      <StarIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" title="Current Default" />
                    ) : (
                      <button
                        onClick={() => handleSetDefault(item as LookupItemExtended)}
                        className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold flex-shrink-0 py-1 px-2 rounded hover:bg-indigo-50"
                        title="Set as Default"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(item as LookupItemExtended)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-100 flex-shrink-0"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item as LookupItemExtended)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100 flex-shrink-0"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-slate-500 text-center py-10 bg-white">
            No {lookupType} found. Add your first entry above.
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;