import { useState, useEffect } from 'react';
import { listenToBankAccounts, addBankAccount, deleteBankAccount, updateBankAccount, type BankAccount } from '../services/firebaseService';
import { TrashIcon, CreditCardIcon, BuildingLibraryIcon, BanknotesIcon, PencilSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline'; // Added DocumentTextIcon

interface ExtendedBankAccount extends BankAccount {
    colorTheme?: string;
}

const BankAccounts = () => {
    const [accounts, setAccounts] = useState<ExtendedBankAccount[]>([]);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [bankName, setBankName] = useState('');
    const [type, setType] = useState<BankAccount['accountType']>('Checking');
    const [last4, setLast4] = useState('');
    const [autopay, setAutopay] = useState('');
    const [statementDate, setStatementDate] = useState(''); // NEW STATE
    const [colorTheme, setColorTheme] = useState('slate');

    useEffect(() => {
        return listenToBankAccounts((accs) => setAccounts(accs as ExtendedBankAccount[]));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankName) return;

        const data = {
            bankName,
            accountType: type,
            last4Digits: last4,
            autopayDate: autopay,
            statementDate: statementDate, // Save new field
            colorTheme
        };

        try {
            if (editingId) {
                await updateBankAccount(editingId, data);
                setEditingId(null);
            } else {
                await addBankAccount(data);
            }
            resetForm();
        } catch (error) {
            console.error("Error saving account:", error);
        }
    };

    const handleEdit = (acc: ExtendedBankAccount) => {
        setEditingId(acc.id);
        setBankName(acc.bankName);
        setType(acc.accountType);
        setLast4(acc.last4Digits);
        setAutopay(acc.autopayDate || '');
        setStatementDate(acc.statementDate || ''); // Load existing
        setColorTheme(acc.colorTheme || 'slate');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setBankName('');
        setLast4('');
        setAutopay('');
        setStatementDate('');
        setColorTheme('slate');
        setEditingId(null);
    };

    // Color Definitions (unchanged)
    const colorThemes: Record<string, string> = {
        slate: 'from-slate-700 to-slate-900',
        blue: 'from-blue-700 to-indigo-900',
        emerald: 'from-emerald-600 to-teal-800',
        red: 'from-red-600 to-red-900',
        purple: 'from-purple-600 to-fuchsia-800',
        gold: 'from-amber-500 to-orange-700',
    };

    const getBackdropIcon = (type: string) => {
        const className = "w-32 h-32";
        switch (type) {
            case 'Credit Card': return <CreditCardIcon className={className} />;
            case 'Checking': return <BanknotesIcon className={className} />;
            case 'Savings': return <BuildingLibraryIcon className={className} />;
            default: return <BuildingLibraryIcon className={className} />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className={`p-6 rounded-xl shadow-sm border sticky top-6 transition-colors ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className={`text-lg font-bold ${editingId ? 'text-indigo-800' : 'text-slate-800'}`}>
                            {editingId ? 'Edit Account' : 'Add Account'}
                        </h2>
                        {editingId && (
                            <button onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-800 underline">Cancel</button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Bank / Issuer</label>
                            <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full p-2 border border-slate-300 rounded mt-1" placeholder="e.g. Chase Sapphire" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Account Type</label>
                            <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 border border-slate-300 rounded mt-1">
                                <option value="Checking">Checking Account</option>
                                <option value="Savings">Savings Account</option>
                                <option value="Credit Card">Credit Card</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Last 4 Digits</label>
                            <input value={last4} onChange={e => setLast4(e.target.value)} maxLength={4} className="w-full p-2 border border-slate-300 rounded mt-1" placeholder="XXXX" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Card Style</label>
                            <div className="flex flex-wrap gap-3">
                                {Object.keys(colorThemes).map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setColorTheme(color)}
                                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorThemes[color]} border-2 transition-all ${colorTheme === color ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                        aria-label={`Select ${color} theme`}
                                    />
                                ))}
                            </div>
                        </div>

                        {type === 'Credit Card' && (
                            <div className="bg-white/50 p-3 rounded-lg border border-slate-200 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase">Autopay Date</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-slate-600">Day</span>
                                        <input type="number" min="1" max="31" value={autopay} onChange={e => setAutopay(e.target.value)} className="w-16 p-2 border border-slate-300 rounded text-center" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase">Statement Date</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-slate-600">Day</span>
                                        <input type="number" min="1" max="31" value={statementDate} onChange={e => setStatementDate(e.target.value)} className="w-16 p-2 border border-slate-300 rounded text-center" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button type="submit" className={`w-full text-white py-3 rounded-lg font-semibold transition-colors mt-2 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                            {editingId ? 'Update Account' : 'Save Account'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Display Grid */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-bold text-slate-800">My Accounts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {accounts.map(acc => {
                        const themeClass = colorThemes[acc.colorTheme || 'slate'] || colorThemes['slate'];
                        const isEditing = editingId === acc.id;

                        return (
                            <div key={acc.id} className={`relative p-6 rounded-xl text-white shadow-lg overflow-hidden group bg-gradient-to-br transition-all ${themeClass} ${isEditing ? 'ring-4 ring-indigo-400 scale-[1.02]' : ''}`}>
                                <div className="absolute -right-6 -top-6 opacity-20 pointer-events-none">
                                    {getBackdropIcon(acc.accountType)}
                                </div>

                                <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-bold uppercase opacity-80 tracking-wider">{acc.accountType}</span>
                                            <h3 className="text-xl font-bold mt-1 text-white text-shadow-sm">{acc.bankName}</h3>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEdit(acc); }}
                                            className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all cursor-pointer text-white"
                                            title="Edit Account"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-end mt-4">
                                        <div>
                                            <div className="text-2xl font-mono tracking-widest opacity-90 text-white">
                                                •••• {acc.last4Digits || '••••'}
                                            </div>

                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                {acc.autopayDate && (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-black/20 text-xs font-medium backdrop-blur-md border border-white/10">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                                        Auto: {acc.autopayDate}th
                                                    </div>
                                                )}
                                                {acc.statementDate && (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-black/20 text-xs font-medium backdrop-blur-md border border-white/10">
                                                        <DocumentTextIcon className="w-3 h-3 text-blue-200" />
                                                        Stmt: {acc.statementDate}th
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this account?')) {
                                                    deleteBankAccount(acc.id);
                                                }
                                            }}
                                            className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-red-500/80 transition-all cursor-pointer text-white"
                                            title="Delete Account"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BankAccounts;