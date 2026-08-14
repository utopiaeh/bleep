# Privacy Policy

Bleep does not collect, store, or transmit any user data to any
server.

All actions performed by this extension — clearing cache, cookies,
storage, service workers, or history — happen entirely within your
browser using the standard WebExtension APIs (`browsingData`, `tabs`,
`scripting`, `history`). Your settings (theme, language, selected data
types, scope mode) are stored locally on your device using the browser's
own `storage` API and never leave it.

No analytics, telemetry, tracking, or remote code of any kind is
included in this extension.

## Permissions

| Permission                                | Purpose                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                 | Persist your settings locally on your device.                                                                                               |
| `tabs`                                    | Read the active tab's URL/id to scope a "clear this site" action, and list open tabs for per-site selection.                                |
| `browsingData`                            | Core clearing mechanism for cache, cookies, storage, and history.                                                                           |
| `scripting`                               | Firefox-only fallback: inject a script into one open tab to clear page-scoped storage APIs Firefox's `browsingData` can't filter by origin. |
| `history`                                 | View and delete individual history entries, and include History in global clears.                                                           |
| `*://*/*` (optional, requested on demand) | Needed only when you first perform a per-site clear, to scope the clear to that site.                                                       |

## Contact

utopiaeh01@gmail.com
