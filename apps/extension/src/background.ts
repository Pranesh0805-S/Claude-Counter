import type { UsagePoint } from "@companion/core";
const KEY = "usagePoints";
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "usage") void record(message.payload);
});
async function record(payload: Record<string, unknown>) {
  const percent = findNumber(payload, ["percentage", "percent_used", "utilization"]);
  const reset = findString(payload, ["reset_at", "resets_at", "window_end"]);
  if (percent === undefined && !reset) return;
  const point: UsagePoint = {source:"claude-web", capturedAt:new Date().toISOString(), percentUsed:percent, windowEndsAt:reset};
  const current = ((await chrome.storage.local.get(KEY))[KEY] ?? []) as UsagePoint[];
  await chrome.storage.local.set({[KEY]: [...current.slice(-499), point]});
  if (reset) chrome.alarms.create("reset", { when: Date.parse(reset) });
}
chrome.alarms.onAlarm.addListener(a => { if (a.name === "reset") chrome.notifications.create({type:"basic",iconUrl:chrome.runtime.getURL("icon.svg"),title:"Claude window refreshed",message:"Your tracked usage window may be available again."}); });
function findNumber(o: Record<string, unknown>, names: string[]): number | undefined { for (const [k,v] of Object.entries(o)) { if (names.includes(k) && typeof v === "number") return v <= 1 ? Math.round(v*100) : v; if (typeof v === "object" && v) { const r=findNumber(v as Record<string,unknown>,names); if(r!==undefined)return r; } } }
function findString(o: Record<string, unknown>, names: string[]): string | undefined { for (const [k,v] of Object.entries(o)) { if (names.includes(k) && typeof v === "string") return v; if(typeof v === "object" && v) { const r=findString(v as Record<string,unknown>,names); if(r)return r; } } }
