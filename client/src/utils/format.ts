const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' });

export function formatDate(value: string | Date) {
  return dateFormatter.format(typeof value === 'string' ? new Date(value) : value);
}
