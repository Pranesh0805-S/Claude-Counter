# Claude Usage Companion

A privacy-first, cross-platform usage companion for two distinct Claude products:

- **Browser extension:** locally observes Claude web *usage-window metadata* (such as a reported percentage and refresh time) and can alert when a tracked window resets.
- **Electron companion:** gets official API token reports from Anthropic's **Admin API**, stored and calculated locally.

It deliberately does **not** claim to inspect the Claude Desktop application or access its private network traffic. There is no public API for Claude subscription 5-hour/weekly limits, so a companion app cannot reliably retrieve those figures. The browser extension is the optional web-side tracker; the desktop app is for Console/API use.

## Included features

- Shared typed usage model and normalization logic
- 7-day Admin API token totals, including cache tokens, with model count
- OS-encrypted Admin API key storage (`safeStorage`); keys never enter the renderer process
- Local-only extension history, JSON export, and reset notification
- No prompt, conversation, cookie, or credential collection
- Defensive schema detection so unrecognized Claude responses are ignored

## Start developing

Requires Node.js 20+.

```sh
npm install
npm run build
```

For the desktop app, run `npm run start -w @companion/desktop`. Load the extension build output from `apps/extension/dist` as an unpacked Chromium extension. During extension development, use `npm run build -w @companion/extension` after changes.

## Publishing a release

Push a semantic version tag to build and publish installers automatically for Windows, macOS, and Linux:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow uses GitHub's temporary `GITHUB_TOKEN`; no Anthropic key is used during builds.

## Limitations and ethics

Claude web response shapes can change without notice, so web tracking is best-effort and does not bypass limits. The extension is intentionally scoped to `claude.ai` and forwards only detected usage metadata to its own local storage. Admin usage requires an Anthropic **Admin API key**, not a standard API key.

The implementation is based on Anthropic's documented [Messages Usage Report endpoint](https://docs.anthropic.com/en/api/admin-api/usage-cost/get-messages-usage-report), which supports time buckets and model grouping.
