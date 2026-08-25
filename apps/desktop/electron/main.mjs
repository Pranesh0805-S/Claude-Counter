import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
const keyFile = () => join(app.getPath("userData"), "admin-key.bin");
async function getKey() { if (!existsSync(keyFile())) return null; if (!safeStorage.isEncryptionAvailable()) throw new Error("OS encryption is unavailable; key was not read."); return safeStorage.decryptString(await readFile(keyFile())); }
async function fetchReport() {
  const key = await getKey(); if (!key) throw new Error("Save an Anthropic Admin API key first.");
  const ending = new Date(); const starting = new Date(ending.getTime() - 7 * 86400000);
  const query = new URLSearchParams({starting_at:starting.toISOString(), ending_at:ending.toISOString(), bucket_width:"1d", limit:"7"});
  const response = await fetch(`https://api.anthropic.com/v1/organizations/usage_report/messages?${query}`, {headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"}});
  if (!response.ok) throw new Error(`Anthropic report unavailable (${response.status}). Confirm this is an Admin API key.`);
  const body = await response.json(); const models=new Set(); let totalTokens=0;
  for (const bucket of body.data ?? []) for (const r of bucket.results ?? []) { models.add(r.model); totalTokens += (r.uncached_input_tokens||0)+(r.output_tokens||0)+(r.cache_read_input_tokens||0)+Object.values(r.cache_creation||{}).reduce((a,b)=>a+b,0); }
  return {totalTokens,models:models.size,days:7};
}
function createWindow(){const win=new BrowserWindow({width:900,height:720,webPreferences:{contextIsolation:true,nodeIntegration:false,preload:join(import.meta.dirname,"preload.mjs")}}); const dev=process.env.VITE_DEV_SERVER_URL; win.loadURL(dev || `file://${join(import.meta.dirname,"../dist/index.html")}`);}
app.whenReady().then(()=>{ipcMain.handle("has-key",async()=>Boolean(await getKey()));ipcMain.handle("save-key",async(_,key)=>{if(typeof key!=="string"||key.length<10)throw new Error("Enter a valid Admin API key.");if(!safeStorage.isEncryptionAvailable())throw new Error("OS encryption is unavailable; refusing to store the key.");await writeFile(keyFile(),safeStorage.encryptString(key));});ipcMain.handle("get-report",fetchReport);createWindow();});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
