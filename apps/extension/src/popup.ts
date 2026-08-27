import { summarize, type UsagePoint } from "@companion/core";

const key = "usagePoints";

async function initializePopup() {
  const data = ((await chrome.storage.local.get(key))[key] ?? []) as UsagePoint[];
  const summary = summarize(data, "claude-web");

  document.querySelector("#value")!.textContent = summary.percentUsed === undefined
    ? "No tracked usage yet"
    : `${summary.percentUsed}% of current window used`;
  const reset = document.querySelector("#reset")!;
  const countdown = document.querySelector("#countdown") as HTMLDivElement;
  reset.textContent = summary.resetAt ? `Estimated refresh: ${new Date(summary.resetAt).toLocaleString()}` : "Open Claude to collect a current window.";
  document.querySelector("#captured")!.textContent = summary.latestAt ? `Last captured ${new Date(summary.latestAt).toLocaleString()}` : "Waiting for a usage response…";
  const updateCountdown = () => {
    if (!summary.resetAt) return;
    const remaining = Date.parse(summary.resetAt) - Date.now();
    if (remaining <= 0) { countdown.hidden = true; countdown.textContent = "Window should be refreshed"; return; }
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    countdown.hidden = false;
    countdown.textContent = `Resets in ${hours}h ${minutes}m ${seconds}s`;
  };
  updateCountdown();
  if (summary.resetAt) window.setInterval(updateCountdown, 1000);
  document.querySelector("#export")!.addEventListener("click", () => {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    anchor.download = "claude-usage-local.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  });
}

void initializePopup();
