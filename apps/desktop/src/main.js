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
