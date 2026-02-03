import { useState, useEffect } from 'react';
import { listenToSubscriptions, addSubscription, deleteSubscription, updateSubscription, type Subscription } from '../services/firebaseService';
import { useLookups } from '../context/LookupContext';
import { TrashIcon, CheckCircleIcon, XCircleIcon, PencilSquareIcon, CalendarDaysIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';

const Subscriptions = () => {
    const [subs, setSubs] = useState<Subscription[]>([]);
    const { categories, paymentMethods } = useLookups();
    const { currentCurrency, usdToInrRate } = useCurrency();

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [billingDay, setBillingDay] = useState('1');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [billingMonth, setBillingMonth] = useState((new Date().getMonth() + 1).toString()); // DEFAULT TO CURRENT MONTH
    const [category, setCategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [include, setInclude] = useState(true);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        return listenToSubscriptions(setSubs);
    }, []);

    // Initialize dropdowns defaults
    useEffect(() => {
        if (!editingId) {
            if (categories.length > 0 && !category) setCategory(categories[0].name);
            if (paymentMethods.length > 0 && !paymentMethod) setPaymentMethod(paymentMethods[0].name);
        }
    }, [categories, paymentMethods, editingId, category, paymentMethod]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount) return;

        const data = {
            name,
            amount: parseFloat(amount),
            billingDay: parseInt(billingDay),
            billingCycle,
            billingMonth: billingCycle === 'yearly' ? parseInt(billingMonth) : 1,
            category,
            paymentMethod,
            include
        };

        try {
            if (editingId) {
                await updateSubscription(editingId, data);
                setEditingId(null);
            } else {
                await addSubscription(data);
            }
            resetForm();
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (sub: Subscription) => {
        setEditingId(sub.id);
        setName(sub.name);
        setAmount(sub.amount.toString());
        setBillingDay(sub.billingDay.toString());
        setBillingCycle(sub.billingCycle || 'monthly');
        setBillingMonth(sub.billingMonth ? sub.billingMonth.toString() : (new Date().getMonth() + 1).toString());
        setCategory(sub.category);
        setPaymentMethod(sub.paymentMethod);
        setInclude(sub.include);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setName('');
        setAmount('');
        setBillingDay('1');
        setBillingCycle('monthly');
        setBillingMonth((new Date().getMonth() + 1).toString()); // Reset to current month
        setInclude(true);
        setEditingId(null);
        if (categories.length > 0) setCategory(categories[0].name);
        if (paymentMethods.length > 0) setPaymentMethod(paymentMethods[0].name);
    };

    // Calculate Amortized Monthly Cost
    const totalMonthlyAmortized = subs
        .filter(s => s.include)
        .reduce((sum, s) => {
            const cost = s.billingCycle === 'yearly' ? s.amount / 12 : s.amount;
            return sum + cost;
        }, 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <h2 className="text-indigo-100 font-medium mb-1">Estimated Monthly Cost</h2>
                <div className="text-4xl font-bold">{formatCurrency(totalMonthlyAmortized, currentCurrency, usdToInrRate)}</div>
                <p className="text-sm text-indigo-100 mt-2 opacity-80 flex items-center gap-1">
                    <ArrowPathIcon className="w-4 h-4" />
                    {subs.filter(s => s.include).length} active subscriptions (Yearly items amortized)
                </p>
            </div>

            {/* Add/Edit Form */}
            <div className={`p-6 rounded-xl shadow-sm border transition-colors ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold ${editingId ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {editingId ? 'Edit Subscription' : 'Add New Subscription'}
                    </h3>
                    {editingId && (
                        <button onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-800 underline">
                            Cancel Edit
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Service Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded mt-1" placeholder="e.g. Amazon Prime" required />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border border-slate-300 rounded mt-1" placeholder="0.00" required />
                    </div>

                    {/* Cycle Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Billing Cycle</label>
                        <select value={billingCycle} onChange={e => setBillingCycle(e.target.value as 'monthly' | 'yearly')} className="w-full p-2 border border-slate-300 rounded mt-1 font-medium text-slate-700">
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>

                    {/* Conditional Inputs: Monthly vs Yearly */}
                    {billingCycle === 'monthly' ? (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Day of Month</label>
                            <div className="flex items-center mt-1">
                                <span className="bg-slate-100 border border-r-0 border-slate-300 p-2 rounded-l text-slate-500 text-sm">Day</span>
                                <input type="number" min="1" max="31" value={billingDay} onChange={e => setBillingDay(e.target.value)} className="w-full p-2 border border-slate-300 rounded-r" required />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Billing Date</label>
                            <div className="flex gap-1 mt-1">
                                {/* Month Dropdown */}
                                <select value={billingMonth} onChange={e => setBillingMonth(e.target.value)} className="w-2/3 p-2 border border-slate-300 rounded text-xs bg-white">
                                    {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                                {/* Day Input */}
                                <input type="number" min="1" max="31" value={billingDay} onChange={e => setBillingDay(e.target.value)} className="w-1/3 p-2 border border-slate-300 rounded text-center text-xs" required />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border border-slate-300 rounded mt-1">
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 border border-slate-300 rounded mt-1">
                            {paymentMethods.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="lg:col-span-6">
                        <button type="submit" className={`p-3 rounded font-semibold w-full text-white transition-colors shadow-sm ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                            {editingId ? 'Update Subscription' : 'Add Subscription'}
                        </button>
                    </div>
                </form>

                <div className="mt-4 flex items-center gap-2">
                    <input type="checkbox" id="autoAdd" checked={include} onChange={e => setInclude(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <label htmlFor="autoAdd" className="text-sm text-slate-600">
                        Automatically add to Transactions table {billingCycle === 'yearly' ? 'once a year' : 'every month'}
                    </label>
                </div>
            </div>

            {/* Subscriptions List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="p-4">Service</th>
                            <th className="p-4">Cost</th>
                            <th className="p-4 hidden sm:table-cell">Frequency</th>
                            <th className="p-4 hidden sm:table-cell">Next Bill</th>
                            <th className="p-4 hidden md:table-cell">Details</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {subs.map(sub => {
                            const isYearly = sub.billingCycle === 'yearly';
                            // Short month name for display
                            const displayMonth = isYearly && sub.billingMonth
                                ? monthNames[sub.billingMonth - 1].substring(0, 3)
                                : '';

                            return (
                                <tr key={sub.id} className={`transition-colors ${editingId === sub.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                    <td className="p-4 font-bold text-slate-800">{sub.name}</td>
                                    <td className="p-4 font-mono font-medium">
                                        {formatCurrency(sub.amount, currentCurrency, usdToInrRate)}
                                    </td>
                                    <td className="p-4 hidden sm:table-cell">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isYearly ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {isYearly ? 'Yearly' : 'Monthly'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600 hidden sm:table-cell">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                                            {isYearly
                                                ? `${displayMonth} ${sub.billingDay}`
                                                : `Day ${sub.billingDay}`
                                            }
                                        </div>
                                    </td>
                                    <td className="p-4 hidden md:table-cell">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs px-2 py-0.5 bg-slate-100 rounded w-fit">{sub.category}</span>
                                            <span className="text-xs text-slate-500">{sub.paymentMethod}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => updateSubscription(sub.id, { include: !sub.include })} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${sub.include ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {sub.include ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                                            <span className="hidden sm:inline">{sub.include ? 'Active' : 'Paused'}</span>
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleEdit(sub)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Edit">
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => deleteSubscription(sub.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {subs.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-400">No subscriptions yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Subscriptions;