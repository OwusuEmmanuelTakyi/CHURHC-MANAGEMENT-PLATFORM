const ghs = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' });

export function formatGHS(pesewas: number): string {
  return ghs.format(pesewas / 100);
}
