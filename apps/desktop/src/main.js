import "./style.css";
const $ = id => document.querySelector(id);
async function refresh() {
  $("#status").textContent = "Refreshing official usage report…";
  try {
    const r = await window.usage.getReport();
    $("#tokens").textContent = r.totalTokens.toLocaleString();
    $("#models").textContent = String(r.models);
    $("#period").textContent = `Last ${r.days} days · updated ${new Date().toLocaleTimeString()}`;
    $("#status").textContent = "Connected — local aggregate only.";
  } catch (error) { $("#status").textContent = error.message; }
}
$("#refresh").addEventListener("click", refresh);
$("#key-form").addEventListener("submit", async event => { event.preventDefault(); const key=$("#key").value.trim(); if(!key) return; try { await window.usage.saveKey(key); $("#key").value=""; await refresh(); } catch(e) { $("#status").textContent=e.message; }});
window.usage.hasKey().then(yes => { if (yes) refresh(); });
