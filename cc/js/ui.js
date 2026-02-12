export function renderResults(
  btcAmount,
  sats,
  spread,
  marketRate,
  rateAge,
  source,
) {
  const resultsEl = document.getElementById("results");
  const btcAmountEl = document.getElementById("btc-amount");
  const satsAmountEl = document.getElementById("sats-amount");
  const spreadValueEl = document.getElementById("spread-value");
  const warningIconEl = document.getElementById("warning-icon");
  const marketRateEl = document.getElementById("market-rate");
  const rateSourceEl = document.getElementById("rate-source");
  const errorEl = document.getElementById("error");

  errorEl.classList.add("hidden");
  resultsEl.classList.remove("hidden");

  btcAmountEl.textContent = `${btcAmount.toFixed(8)} BTC`;
  satsAmountEl.textContent = `(${sats.toLocaleString("en-US")} sats)`;

  const spreadClass =
    spread < 0 ? "spread-negative" : spread > 2 ? "spread-warning" : "";
  spreadValueEl.textContent = `${spread >= 0 ? "+" : ""}${spread.toFixed(2)}%`;
  spreadValueEl.className = spreadClass;

  if (spread > 2) {
    warningIconEl.classList.remove("hidden");
  } else {
    warningIconEl.classList.add("hidden");
  }

  marketRateEl.textContent = `Market: ${marketRate.toLocaleString("en-US")} GEL`;

  let sourceText = `(${source}`;
  if (rateAge > 0) {
    const minutes = Math.floor(rateAge / 60000);
    sourceText += `, ${minutes} min ago`;
  }
  sourceText += ")";
  rateSourceEl.textContent = sourceText;
}

export function renderHistory(entries) {
  const historyListEl = document.getElementById("history-list");

  if (!entries || entries.length === 0) {
    historyListEl.innerHTML =
      '<div class="text-center opacity-60 py-12">No saved calculations</div>';
    return;
  }

  historyListEl.innerHTML = entries
    .map((entry) => {
      const date = new Date(entry.date);
      const dateStr = date.toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const spreadClass =
        entry.spread < 0
          ? "spread-negative"
          : entry.spread > 2
            ? "spread-warning"
            : "";
      const spreadSign = entry.spread >= 0 ? "+" : "";

      return `
      <div class="history-item" data-id="${entry.id}">
        <div class="flex justify-between items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="text-xs opacity-60 mb-2">${dateStr} MSK</div>
            <div class="font-bold text-lg mb-1">${entry.btcAmount.toFixed(8)} BTC</div>
            <div class="text-sm opacity-70 mb-3">(${Math.floor(entry.btcAmount * 100000000).toLocaleString("en-US")} sats)</div>
            <div class="text-sm space-y-1 opacity-80">
              <div class="flex justify-between">
                <span>GEL:</span>
                <span class="font-semibold">${entry.gel.toLocaleString("en-US")}</span>
              </div>
              <div class="flex justify-between">
                <span>Office:</span>
                <span>${entry.officeRate.toLocaleString("en-US")} GEL</span>
              </div>
              <div class="flex justify-between">
                <span>Market:</span>
                <span>${entry.marketRate.toLocaleString("en-US")} GEL</span>
              </div>
              <div class="flex justify-between font-semibold pt-1">
                <span>Spread:</span>
                <span class="${spreadClass}">${spreadSign}${entry.spread.toFixed(2)}%</span>
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-ghost btn-square delete-btn" data-id="${entry.id}" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = parseInt(btn.dataset.id);
      const event = new CustomEvent("delete-history", { detail: { id } });
      document.dispatchEvent(event);
    });
  });
}

export function renderStatus(state, message = "") {
  const statusEl = document.getElementById("status");
  const dotEl = statusEl.querySelector(".status-dot");
  const textEl = statusEl.querySelector("span:last-child");

  dotEl.className = "status-dot";

  if (state === "online") {
    dotEl.classList.add("online");
    textEl.textContent = message || "Online (CoinGecko)";
  } else if (state === "cached") {
    dotEl.classList.add("cached");
    textEl.textContent = message || "Cached";
  } else if (state === "offline") {
    dotEl.classList.add("offline");
    textEl.textContent = message || "Offline";
  }
}

export function renderError(message) {
  const resultsEl = document.getElementById("results");
  const errorEl = document.getElementById("error");
  const errorMessageEl = document.getElementById("error-message");

  resultsEl.classList.add("hidden");
  errorEl.classList.remove("hidden");
  errorMessageEl.textContent = message;
}

export function hideError() {
  const errorEl = document.getElementById("error");
  errorEl.classList.add("hidden");
}
