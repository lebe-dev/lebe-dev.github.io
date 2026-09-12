export const RATE_CACHE_DURATION = 120000;

export function calcSpread(officeRate, marketRate) {
  if (marketRate === 0) return 0;
  return ((officeRate - marketRate) / marketRate) * 100;
}

export function calcBtcAmount(gel, officeRate) {
  if (officeRate === 0) return 0;
  return gel / officeRate;
}

export function calcSats(btcAmount) {
  return Math.floor(btcAmount * 100000000);
}

export function isRateStale(timestamp, now = Date.now()) {
  return now - timestamp > RATE_CACHE_DURATION;
}

export function getFriendlyErrorMessage(errorMessage, ageMs) {
  const minutes = Math.floor(ageMs / 60000);

  if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
    return `Кэш (${minutes} мин) — API лимит, данные актуальны`;
  }

  if (errorMessage.includes("timeout") || errorMessage.includes("AbortError")) {
    return `Кэш (${minutes} мин) — медленное соединение`;
  }

  return `Кэш (${minutes} мин) — нет связи`;
}

export function isPositiveNumber(value) {
  return !isNaN(value) && value > 0;
}
