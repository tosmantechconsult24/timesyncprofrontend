// Currency formatter for Nigerian Naira (NGN)
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '₦0.00';
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Alternative format without symbol
export const formatAmount = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '0.00';
  
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format with Naira symbol
export const formatNaira = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '₦0.00';
  return `₦${formatAmount(amount)}`;
};

// Currency symbol
export const CURRENCY_SYMBOL = '₦';
export const CURRENCY_CODE = 'NGN';
export const CURRENCY_NAME = 'Nigerian Naira';