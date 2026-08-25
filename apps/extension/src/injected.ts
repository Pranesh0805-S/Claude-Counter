// Deliberately narrow and schema-agnostic. We only relay same-page JSON responses that
// look like usage windows; no prompts, conversations, cookies, or credentials are read.
const looksLikeUsage = (url: string, body: unknown) =>
  /usage|limit|rate[_-]?limit/i.test(url) && typeof body === "object" && body !== null;
const relay = (url: string, body: unknown) => {
  if (looksLikeUsage(url, body)) window.dispatchEvent(new CustomEvent("claude-usage-companion", {detail:{kind:"usage", payload:body}}));
};
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args); const url = typeof args[0] === "string" ? args[0] : args[0].url;
  if (/usage|limit|rate[_-]?limit/i.test(url)) response.clone().json().then(body => relay(url, body)).catch(() => undefined);
  return response;
};
