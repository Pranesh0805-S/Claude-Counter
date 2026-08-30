import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("usage", {hasKey:()=>ipcRenderer.invoke("has-key"),saveKey:key=>ipcRenderer.invoke("save-key",key),removeKey:()=>ipcRenderer.invoke("remove-key"),getReport:(days)=>ipcRenderer.invoke("get-report",days)});
