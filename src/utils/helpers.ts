import { Timestamp } from "firebase/firestore";

export const formatCurrency = (amount: number, currency: string = 'USD', rate: number | null = null): string => {
  if (isNaN(amount)) {
    return 'N/A';
  }
  const formattedAmount = parseFloat(amount.toFixed(2));
  if (currency === 'INR' && rate) {
    const convertedAmount = formattedAmount * rate;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(convertedAmount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(formattedAmount);
};

// Changed date format to "Month Day, Year"
export const formatTimestampForDisplay = (timestamp: Timestamp): string => {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return 'Invalid Date';
  }
  return timestamp.toDate().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTimestampForInput = (timestamp: Timestamp): string => {
  if (!timestamp || !timestamp.toDate) return '';
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTimestampForExport = (timestamp: Timestamp): string => {
  if (!timestamp || !timestamp.toDate) return '';
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day}/${year}`;
};

export const getMonthName = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};
