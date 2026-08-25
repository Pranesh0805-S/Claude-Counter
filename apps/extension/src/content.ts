// Main-world injection is required: content scripts cannot observe the page's fetch/XHR calls.
const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/injected.ts");
script.onload = () => script.remove();
(document.head || document.documentElement).append(script);

window.addEventListener("claude-usage-companion", (event) => {
  const detail = (event as CustomEvent).detail;
  if (detail?.kind === "usage" && typeof detail.payload === "object") {
    chrome.runtime.sendMessage({ type: "usage", payload: detail.payload });
  }
});
