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

  btcAmountEl.textContent = btcAmount.toFixed(8);
  satsAmountEl.textContent = `${sats.toLocaleString("en-US")} sats`;

  const spreadClass =
    spread < 0
      ? "cc-spread-value spread-negative"
      : spread > 2
        ? "cc-spread-value spread-warning"
        : "cc-spread-value";
  spreadValueEl.textContent = `${spread >= 0 ? "+" : ""}${spread.toFixed(2)}%`;
  spreadValueEl.className = spreadClass;

  if (spread > 2) {
    warningIconEl.classList.add("cc-warning-icon");
    warningIconEl.classList.remove("cc-icon-muted");
  } else {
    warningIconEl.classList.remove("cc-warning-icon");
    warningIconEl.classList.add("cc-icon-muted");
  }
  warningIconEl.classList.remove("hidden");

  marketRateEl.textContent = `Market: ${marketRate.toLocaleString("en-US")} GEL`;

  const minutes = Math.floor(rateAge / 60000);
  rateSourceEl.textContent = `(${source}, ${minutes}m ago)`;
}

export function renderHistory(entries) {
  const historyListEl = document.getElementById("history-list");

  if (!entries || entries.length === 0) {
    historyListEl.innerHTML =
      '<div class="cc-history-empty">No calculations yet</div>';
    return;
  }

  historyListEl.innerHTML = entries
    .map((entry) => {
      const date = new Date(entry.date);
      const dateStr = date.toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const spreadClass =
        entry.spread < 0
          ? "cc-history-spread spread-negative"
          : entry.spread > 2
            ? "cc-history-spread spread-warning"
            : "cc-history-spread";
      const spreadSign = entry.spread >= 0 ? "+" : "";

      return `
      <div class="cc-history-item" data-id="${entry.id}">
        <div class="cc-history-top">
          <span class="cc-history-btc">${entry.btcAmount.toFixed(8)} BTC</span>
          <span class="${spreadClass}">${spreadSign}${entry.spread.toFixed(2)}%</span>
        </div>
        <div class="cc-history-details">
          <span>Amount</span>
          <span class="cc-history-detail-val">${entry.gel.toLocaleString("en-US")} GEL</span>
          <span>Office</span>
          <span class="cc-history-detail-val">${entry.officeRate.toLocaleString("en-US")}</span>
          <span>Market</span>
          <span class="cc-history-detail-val">${entry.marketRate.toLocaleString("en-US")}</span>
        </div>
        <div class="cc-history-footer">
          <span class="cc-history-date">${dateStr} MSK</span>
          <button class="cc-history-delete delete-btn" data-id="${entry.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>`;
    })
    .join("");

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      const event = new CustomEvent("delete-history", { detail: { id } });
      document.dispatchEvent(event);
    });
  });
}

export function renderStatus(state, message = "") {
  const statusEl = document.getElementById("status");
  const dotEl = statusEl.querySelector(".cc-status-dot");
  const textEl = statusEl.querySelector(".cc-status-text");

  dotEl.className = "cc-status-dot";

  if (state === "online") {
    dotEl.classList.add("online");
    textEl.textContent = message || "Online";
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
