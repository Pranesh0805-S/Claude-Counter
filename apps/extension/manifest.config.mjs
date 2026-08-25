export default {
  manifest_version: 3, name: "Claude Usage Companion", version: "0.1.0",
  description: "Private, local Claude web usage window tracker.",
  permissions: ["storage", "alarms", "notifications"],
  host_permissions: ["https://claude.ai/*"],
  background: { service_worker: "src/background.ts", type: "module" },
  action: { default_popup: "src/popup.html", default_title: "Claude Usage" },
  content_scripts: [{ matches: ["https://claude.ai/*"], js: ["src/content.ts"], run_at: "document_start" }],
  web_accessible_resources: [{ resources: ["src/injected.ts"], matches: ["https://claude.ai/*"] }]
};
