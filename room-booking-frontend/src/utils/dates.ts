export function toApiDateTime(value: string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function defaultSearchStart() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(date);
}

export function defaultSearchEnd() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(12, 0, 0, 0);
  return toDatetimeLocalValue(date);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDateRange(from: string, to: string) {
  return `${formatDateTime(from)} — ${formatDateTime(to)}`;
}

export function hoursBetween(from: string, to: string) {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(diff / 3_600_000, 0);
}

export function formatMoney(value: number | string) {
  const numberValue = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numberValue) ? numberValue : 0);
}
