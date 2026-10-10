# PR #822 public-head evidence

Source: [`Gryt-chat/client#822`](https://github.com/Gryt-chat/client/pull/822),
`93b05af9d062a502110cb5dc686eebe37a48083f` (506 locale keys).
The source checkout stayed clean. This branch only stores evidence; the PR head
has not changed.

The production Web build passed `yarn build` (TypeScript and Vite) on Node
24.10.0. `yarn test:i18n` passed the 506-key, preference, fallback, interpolation
and plural checks. Dependencies came from an independent copied tree, with
published `@gryt/voice` 0.6.2 verified against `yarn.lock`; no frozen install was
executed during this evidence run.

## Screenshots

| Surface | English | Simplified Chinese |
| --- | --- | --- |
| Production guest welcome | [English](en-welcome.png) | [Chinese](zh-CN-welcome.png) |
| Production open Display settings | [Before selecting Chinese](en-language-settings.png) | [After selecting Chinese](zh-CN-language-settings.png) |
| Public component harness: same open invitation and retained error | [After storage event](en-open-invite.png) | [Before storage event](zh-CN-open-invite.png) |

[Missing-key fallback](zh-CN-missing-key-fallback.png) deliberately removes
`invite.accept` from the Chinese **in-memory** resources in the public component
harness. The title stays Chinese and the action reads `Accept Invite` in English.
This is a controlled fallback fixture, not a missing key in the committed JSON.

[Blocked-storage narrow screenshot](zh-CN-blocked-storage-narrow.png) uses the
public component harness at 390px. Its English buttons and JSON outputs belong
to the test harness, rather than production UI.

## Assertions

Five new headless assertions passed:

1. The production selector changes English to Chinese while settings remain open,
   updates `html.lang`, stores `zh-CN`, and leaves the identity fixture unchanged.
2. Reload retains Chinese and the production selector shows the saved choice.
3. A storage event updates the open public invitation and its retained local
   error; the user-supplied server name stays unchanged.
4. The controlled missing Chinese key falls back to the English action label.
5. An unsupported Japanese system language falls back to English. Blocking
   preference writes still permits a session switch to Chinese; reload returns
   to the system fallback.

`evidence.json` contains the observed results and SHA-256 of each original PNG.
`capture.mjs` contains the runner. To reproduce, put that script beside a clean
checkout named `gryt-client-822-evidence-work`, detach it at the source commit,
install the public dependencies, build the Web app, and run the script with
Node and installed Playwright Chromium. It sequentially serves the production
build and the public source harness on loopback ports 4797 and 4798.

The run used fresh browser contexts, mocked external HTTP/WebSocket requests and
media methods, headless Chromium with GPU disabled, one browser, low priority,
and two CPU cores. Device enumeration returned an empty fixture list. No real
profile or microphone was used. The browser was closed and the owned Node/Vite
processes and server ports were absent after completion.

## Remaining limits

The migration is partial. The untranslated areas recorded in
`I18N-DEVELOPMENT.md` remain open. Earlier six Playwright tests and sixteen
selected source checks are recorded in `I18N-VALIDATION.md`; this evidence run
did not rerun the full suite. The recorded broad Windows result remains
non-green, with nine platform failures and one excluded AppImage fixture.
Real calls/devices, native PTT, OS IME, Electron and updater installation have
not been accepted. Upstream CI is still waiting for maintainer approval.

Captured and checked with Codex (GPT-6) assistance.
