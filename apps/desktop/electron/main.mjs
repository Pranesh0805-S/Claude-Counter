import { app, BrowserWindow, ipcMain, safeStorage, dialog, Notification } from "electron";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const keyFile = () => join(app.getPath("userData"), "admin-key.bin");
async function getKey() { if (!existsSync(keyFile())) return null; if (!safeStorage.isEncryptionAvailable()) throw new Error("OS encryption is unavailable; key was not read."); return safeStorage.decryptString(await readFile(keyFile())); }
async function fetchReport(_event, requestedDays = 7) {
  const days = requestedDays === 30 ? 30 : 7;
  const key = await getKey(); if (!key) throw new Error("Save an Anthropic Admin API key first.");
  const ending = new Date(); const starting = new Date(ending.getTime() - days * 86400000);
  const query = new URLSearchParams({starting_at:starting.toISOString(), ending_at:ending.toISOString(), bucket_width:"1d", limit:String(days)});
  const url = `https://api.anthropic.com/v1/organizations/usage_report/messages?${query}`;
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try { response = await fetch(url, {headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"}, signal: controller.signal}); }
    catch (error) { if (attempt === 2) throw new Error(error.name === "AbortError" ? "Anthropic request timed out after 15 seconds." : "Unable to reach Anthropic. Check your internet connection."); }
    finally { clearTimeout(timeout); }
    if (response?.ok || (response?.status !== 429 && response?.status < 500)) break;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  if (!response?.ok) { if (response?.status === 401 || response?.status === 403) throw new Error("Anthropic rejected this key. Confirm it is an Admin API key with usage-report access."); throw new Error(`Anthropic report unavailable (${response?.status ?? "unknown"}). Try again shortly.`); }
  const body = await response.json(); const models=new Set(); const modelUsage=new Map(); let totalTokens=0; let totalCacheTokens=0;
  const daily = (body.data ?? []).map((bucket) => { let tokens=0; let cacheTokens=0; for (const r of bucket.results ?? []) { if (r.model) { models.add(r.model); const existing=modelUsage.get(r.model)||0; modelUsage.set(r.model, existing + (r.uncached_input_tokens||0) + (r.output_tokens||0) + (r.cache_read_input_tokens||0) + Object.values(r.cache_creation||{}).reduce((a,b)=>a+(typeof b === "number" ? b : 0),0)); } const cacheRead=r.cache_read_input_tokens||0; const cacheWrite=Object.values(r.cache_creation||{}).reduce((a,b)=>a+(typeof b === "number" ? b : 0),0); const input=r.uncached_input_tokens||0; const output=r.output_tokens||0; cacheTokens += cacheRead + cacheWrite; tokens += input + output + cacheRead + cacheWrite; } totalTokens += tokens; totalCacheTokens += cacheTokens; return {date:bucket.ending_at || new Date().toISOString(),tokens,cacheTokens}; });
  return {totalTokens,cacheTokens:totalCacheTokens,models:models.size,modelUsage:[...modelUsage].map(([model,tokens])=>({model,tokens})).sort((a,b)=>b.tokens-a.tokens),days,daily};
}
function createWindow(){const win=new BrowserWindow({width:900,height:720,minWidth:720,minHeight:600,backgroundColor:"#f4f7f5",webPreferences:{contextIsolation:true,nodeIntegration:false,preload:join(import.meta.dirname,"preload.mjs")}}); const dev=process.env.VITE_DEV_SERVER_URL; win.loadURL(dev || pathToFileURL(join(import.meta.dirname,"../renderer-dist/index.html")).toString());}
app.whenReady().then(()=>{ipcMain.handle("has-key",async()=>Boolean(await getKey()));ipcMain.handle("save-key",async(_,key)=>{if(typeof key!=="string"||key.length<10)throw new Error("Enter a valid Admin API key.");if(!safeStorage.isEncryptionAvailable())throw new Error("OS encryption is unavailable; refusing to store the key.");await writeFile(keyFile(),safeStorage.encryptString(key));});ipcMain.handle("remove-key",async()=>{if(existsSync(keyFile())) await unlink(keyFile());});ipcMain.handle("save-csv",async(_,csv)=>{if(typeof csv!=="string"||csv.length>2_000_000)throw new Error("Invalid export data.");const result=await dialog.showSaveDialog({title:"Export usage history",defaultPath:"claude-usage-history.csv",filters:[{name:"CSV files",extensions:["csv"]}]});if(!result.canceled&&result.filePath) await writeFile(result.filePath,csv,"utf8");});ipcMain.handle("notify-threshold",async(_,tokens,threshold)=>{if(typeof tokens!=="number"||typeof threshold!=="number")return;if(Notification.isSupported()) new Notification({title:"Claude usage threshold reached",body:`Your report contains ${tokens.toLocaleString()} tokens (threshold: ${threshold.toLocaleString()}).`}).show();});ipcMain.handle("get-report",fetchReport);createWindow();});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
