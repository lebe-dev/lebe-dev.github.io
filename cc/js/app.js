import { renderResults, renderHistory, renderStatus, renderError, hideError } from './ui.js';

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=gel';
const CACHE_KEY_RATE = 'cc-lastRate';
const CACHE_KEY_HISTORY = 'cc-history';
const RATE_CACHE_DURATION = 120000;
const MAX_HISTORY_ENTRIES = 50;

let currentCalculation = null;

function calcSpread(officeRate, marketRate) {
  if (marketRate === 0) return 0;
  return ((officeRate - marketRate) / marketRate) * 100;
}

function calcBtcAmount(gel, officeRate) {
  if (officeRate === 0) return 0;
  return gel / officeRate;
}

async function fetchRate() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(COINGECKO_API, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit reached');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const rate = data?.bitcoin?.gel;

    if (!rate || rate <= 0) {
      throw new Error('Invalid rate data');
    }

    const rateData = {
      rate,
      timestamp: Date.now(),
      source: 'CoinGecko'
    };

    try {
      localStorage.setItem(CACHE_KEY_RATE, JSON.stringify(rateData));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        cleanupStorage();
        localStorage.setItem(CACHE_KEY_RATE, JSON.stringify(rateData));
      }
    }

    return rateData;
  } catch (error) {
    const cached = getCachedRate();
    if (cached) {
      return cached;
    }
    throw error;
  }
}

function getCachedRate() {
  try {
    const cached = localStorage.getItem(CACHE_KEY_RATE);
    if (!cached) return null;

    const rateData = JSON.parse(cached);
    if (!rateData.rate || !rateData.timestamp) return null;

    return rateData;
  } catch (e) {
    return null;
  }
}

function isRateStale(timestamp) {
  return (Date.now() - timestamp) > RATE_CACHE_DURATION;
}

async function getMarketRate(forceRefresh = false) {
  const cached = getCachedRate();

  if (!forceRefresh && cached && !isRateStale(cached.timestamp)) {
    const age = Date.now() - cached.timestamp;
    renderStatus('cached', `Cached (${Math.floor(age / 60000)} min ago)`);
    return cached;
  }

  try {
    const rateData = await fetchRate();
    renderStatus('online', 'Online (CoinGecko)');
    return rateData;
  } catch (error) {
    if (cached) {
      const age = Date.now() - cached.timestamp;
      renderStatus('cached', `Cached (${Math.floor(age / 60000)} min ago) - ${error.message}`);
      return cached;
    }
    renderStatus('offline', 'Offline');
    throw new Error('Cannot fetch market rate. Check internet connection.');
  }
}

function saveToHistory(entry) {
  try {
    const history = getHistory();
    history.unshift(entry);

    while (history.length > MAX_HISTORY_ENTRIES) {
      history.pop();
    }

    try {
      localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        cleanupStorage();
        localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify(history));
      }
    }

    renderHistory(history);
  } catch (e) {
    renderError('Failed to save to history: ' + e.message);
  }
}

function getHistory() {
  try {
    const history = localStorage.getItem(CACHE_KEY_HISTORY);
    if (!history) return [];

    const parsed = JSON.parse(history);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function deleteEntry(id) {
  try {
    const history = getHistory();
    const filtered = history.filter(entry => entry.id !== id);
    localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify(filtered));
    renderHistory(filtered);
  } catch (e) {
    renderError('Failed to delete entry: ' + e.message);
  }
}

function clearHistory() {
  if (!confirm('Clear all calculation history?')) {
    return;
  }

  try {
    localStorage.removeItem(CACHE_KEY_HISTORY);
    renderHistory([]);
  } catch (e) {
    renderError('Failed to clear history: ' + e.message);
  }
}

function cleanupStorage() {
  const history = getHistory();
  if (history.length > 10) {
    const cleaned = history.slice(0, history.length - 10);
    localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify(cleaned));
  }
}

function validateInputs(gel, officeRate) {
  if (!gel || gel <= 0) {
    throw new Error('GEL amount must be greater than zero');
  }
  if (!officeRate || officeRate <= 0) {
    throw new Error('Office rate must be greater than zero');
  }
}

async function handleCalculate(e) {
  e.preventDefault();
  hideError();

  const gelInput = document.getElementById('gel-input');
  const rateInput = document.getElementById('rate-input');

  const gel = parseFloat(gelInput.value);
  const officeRate = parseFloat(rateInput.value);

  try {
    validateInputs(gel, officeRate);

    const rateData = await getMarketRate(false);
    const marketRate = rateData.rate;

    const btcAmount = calcBtcAmount(gel, officeRate);
    const sats = Math.floor(btcAmount * 100000000);
    const spread = calcSpread(officeRate, marketRate);
    const rateAge = Date.now() - rateData.timestamp;

    renderResults(btcAmount, sats, spread, marketRate, rateAge, rateData.source);

    currentCalculation = {
      id: Date.now(),
      date: new Date().toISOString(),
      gel,
      officeRate,
      marketRate,
      btcAmount,
      spread,
      source: rateData.source
    };
  } catch (error) {
    renderError(error.message);
    currentCalculation = null;
  }
}

async function handleRefresh() {
  hideError();

  try {
    renderStatus('online', 'Fetching...');
    await getMarketRate(true);
  } catch (error) {
    renderError(error.message);
  }
}

function handleSave() {
  if (!currentCalculation) {
    renderError('No calculation to save');
    return;
  }

  saveToHistory(currentCalculation);
  currentCalculation = null;
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/cc/sw.js').catch(() => {});
  }
}

function init() {
  registerSW();

  renderHistory(getHistory());

  const cached = getCachedRate();
  if (cached) {
    const age = Date.now() - cached.timestamp;
    renderStatus('cached', `Cached (${Math.floor(age / 60000)} min ago)`);
  } else {
    renderStatus('offline', 'No cached data');
  }

  document.getElementById('calc-form').addEventListener('submit', handleCalculate);
  document.getElementById('refresh-btn').addEventListener('click', handleRefresh);
  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('clear-all-btn').addEventListener('click', clearHistory);

  document.addEventListener('delete-history', (e) => {
    deleteEntry(e.detail.id);
  });

  getMarketRate(false).catch(() => {});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
