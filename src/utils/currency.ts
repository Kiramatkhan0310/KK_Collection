/**
 * Consistent Pakistani Rupee (PKR) and currency formatter
 */
export function formatCurrency(amount: number, currency: string = 'PKR'): string {
  if (!amount && amount !== 0) return 'Rs. 0';
  if (currency === 'PKR') {
    return `Rs. ${new Intl.NumberFormat('en-PK', {
      maximumFractionDigits: 0
    }).format(amount)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Format relative or standard dates
 */
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
}
