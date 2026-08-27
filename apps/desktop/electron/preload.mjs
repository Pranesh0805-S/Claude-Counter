import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("usage", {hasKey:()=>ipcRenderer.invoke("has-key"),saveKey:key=>ipcRenderer.invoke("save-key",key),removeKey:()=>ipcRenderer.invoke("remove-key"),getReport:()=>ipcRenderer.invoke("get-report")});
