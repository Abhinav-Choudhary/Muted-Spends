import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/helpers';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const Converter: React.FC = () => {
    const [usdAmount, setUsdAmount] = useState<string>('');
    const [inrAmount, setInrAmount] = useState<string>('');
    const [usdToInrRate, setUsdToInrRate] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setUsdToInrRate(data.rates.INR);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch exchange rate:", error);
                setLoading(false);
            }
        };
        fetchExchangeRate();
    }, []);

    const handleUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUsdAmount(value);
        if (usdToInrRate && value) {
            setInrAmount(formatCurrency(parseFloat(value), 'INR', usdToInrRate));
        } else {
            setInrAmount('');
        }
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-2">Currency Converter</h2>
            <p className="text-sm text-slate-500 mb-6">Live conversion from USD to INR.</p>
            <div className="space-y-4">
                <div>
                    <label htmlFor="usd-input" className="block text-sm font-medium text-slate-700">Amount (USD)</label>
                    <input type="number" id="usd-input" value={usdAmount} onChange={handleUsdChange} placeholder="Enter USD amount"
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                    <label htmlFor="inr-output" className="block text-sm font-medium text-slate-700">Amount (INR)</label>
                    <input type="text" id="inr-output" value={inrAmount} readOnly
                        className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm shadow-sm cursor-not-allowed" />
                </div>
            </div>
            <div className="mt-6 text-center text-sm text-slate-500">
                {loading ? <div className="flex justify-center"><ArrowPathIcon className="h-5 w-5 animate-spin text-indigo-600" /></div> : `Current Rate: 1 USD = ${usdToInrRate?.toFixed(2) || 'N/A'} INR`}
            </div>
        </div>
    );
};

export default Converter;