import { useEffect } from 'react';
import { ArrowTrendingUpIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';

interface ToastProps {
  message: string;
  type: 'income' | 'expense';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-close after 3 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const isIncome = type === 'income';

  return (
    <div className={`flex items-center p-4 mb-4 text-white rounded-lg shadow-lg ${isIncome ? 'bg-green-500' : 'bg-red-500'}`}>
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">
        {isIncome ? (
          <ArrowTrendingUpIcon className="w-6 h-6" />
        ) : (
          <CurrencyDollarIcon className="w-6 h-6" />
        )}
      </div>
      <div className="ml-3 text-sm font-medium">{message}</div>
    </div>
  );
};

export default Toast;
