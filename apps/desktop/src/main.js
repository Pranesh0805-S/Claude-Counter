import "./style.css";

const $ = (selector) => document.querySelector(selector);
const loader = $("#app-loader");
const app = $(".app-shell");
const refreshButton = $("#refresh");
const saveButton = $("#save-key");
const status = $("#status");
const connection = $("#connection");
const themeSelect = $("#theme");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const HISTORY_KEY = "usage-history";

function renderHistory(history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")) {
  const chart = $("#history-chart");
  const empty = $("#history-empty");
  if (!chart || !empty) return;
  chart.replaceChildren();
  const points = history.slice(-7);
  empty.hidden = points.length > 0;
  if (!points.length) return;
  const max = Math.max(...points.map((point) => point.tokens), 1);
  for (const point of points) {
    const column = document.createElement("div");
    column.className = "chart-column";
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.height = `${Math.max((point.tokens / max) * 100, 5)}%`;
    bar.title = `${point.tokens.toLocaleString()} tokens`;
    const label = document.createElement("span");
    label.textContent = new Date(`${point.date.slice(0, 10)}T12:00:00`).toLocaleDateString([], { weekday: "short" });
    column.append(bar, label);
    chart.append(column);
  }
}

function saveHistory(daily) {
  const previous = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const merged = new Map(previous.map((entry) => [entry.date.slice(0, 10), entry]));
  for (const entry of daily || []) merged.set(entry.date.slice(0, 10), entry);
  const history = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory(history);
}

function applyTheme(preference) {
  const theme = preference === "system" ? (systemTheme.matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = theme;
}

function initializeTheme() {
  const preference = localStorage.getItem("theme-preference") || "system";
  themeSelect.value = preference;
  applyTheme(preference);
  themeSelect.addEventListener("change", () => {
    localStorage.setItem("theme-preference", themeSelect.value);
    applyTheme(themeSelect.value);
  });
  systemTheme.addEventListener("change", () => {
    if (themeSelect.value === "system") applyTheme("system");
  });
}

function setStatus(message, state = "neutral") {
  status.textContent = message;
  status.dataset.state = state;
  connection.dataset.state = state;
  connection.querySelector("span:last-child").textContent = state === "connected" ? "Admin API connected" : state === "loading" ? "Updating report" : state === "error" ? "Connection needs attention" : "Admin API not connected";
}

function setButtonLoading(button, isLoading, loadingLabel) {
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  const label = button.querySelector(".button-label");
  if (!label.dataset.defaultLabel) label.dataset.defaultLabel = label.textContent;
  label.textContent = isLoading ? loadingLabel : label.dataset.defaultLabel;
}

function setStatsLoading(isLoading) {
  [$("#tokens"), $("#models")].forEach((element) => element.classList.toggle("skeleton", isLoading));
}

async function refresh() {
  setButtonLoading(refreshButton, true, "Refreshing");
  setStatsLoading(true);
  setStatus("Fetching your official usage report…", "loading");
  try {
    const report = await window.usage.getReport();
    $("#tokens").textContent = report.totalTokens.toLocaleString();
    $("#models").textContent = String(report.models);
    saveHistory(report.daily);
    $("#period").textContent = `Last ${report.days} days · updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    setStatus("Report updated. Only local aggregates are displayed here.", "connected");
  } catch (error) {
    setStatus(error.message || "Unable to load the usage report.", "error");
  } finally {
    setButtonLoading(refreshButton, false);
    setStatsLoading(false);
  }
}

refreshButton.addEventListener("click", refresh);
$("#key-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#key");
  const key = input.value.trim();
  if (!key) { setStatus("Enter your Anthropic Admin API key to continue.", "error"); input.focus(); return; }
  setButtonLoading(saveButton, true, "Saving");
  setStatus("Encrypting and saving your key on this device…", "loading");
  try {
    await window.usage.saveKey(key);
    input.value = "";
    setStatus("Key saved securely. Loading your report…", "loading");
    await refresh();
  } catch (error) {
    setStatus(error.message || "Unable to save the API key.", "error");
  } finally { setButtonLoading(saveButton, false); }
});

async function initialize() {
  initializeTheme();
  renderHistory();
  try {
    if (await window.usage.hasKey()) await refresh();
    else setStatus("Add an Admin API key to load your official usage report.", "neutral");
  } catch (error) { setStatus(error.message || "Unable to check the saved connection.", "error"); }
  finally {
    app.setAttribute("aria-busy", "false");
    loader.classList.add("is-hidden");
    window.setTimeout(() => loader.remove(), 260);
  }
}
void initialize();
