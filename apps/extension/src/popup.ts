import { summarize, type UsagePoint } from "@companion/core";

const key = "usagePoints";

async function initializePopup() {
  const data = ((await chrome.storage.local.get(key))[key] ?? []) as UsagePoint[];
  const summary = summarize(data, "claude-web");

  document.querySelector("#value")!.textContent = summary.percentUsed === undefined
    ? "No tracked usage yet"
    : `${summary.percentUsed}% of current window used`;
  document.querySelector("#reset")!.textContent = summary.resetAt
    ? `Estimated refresh: ${new Date(summary.resetAt).toLocaleString()}`
    : "Open Claude to collect a current window.";
  document.querySelector("#export")!.addEventListener("click", () => {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    anchor.download = "claude-usage-local.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  });
}

void initializePopup();
