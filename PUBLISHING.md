# Publishing checklist

## Before every submission

- [ ] Bump `version` in `package.json` (wxt reads it automatically for the
      manifest). Follow [Semantic Versioning](https://semver.org/).
- [ ] `yarn compile && yarn lint && yarn test` all pass.
- [ ] `yarn build && yarn build:firefox` both succeed.
- [ ] `yarn zip && yarn zip:firefox` — produces
      `.output/bleep-<version>-chrome.zip`,
      `.output/bleep-<version>-firefox.zip`, and
      `.output/bleep-<version>-sources.zip`.
- [ ] Manually reload the built extension in both a Chromium browser and
      Firefox and click through: quick-clear (active tab + all sites),
      Settings page (theme, language, data types, scope, per-site list,
      history), reset to defaults.
- [ ] `git tag v<version> && git push --tags` — the `release.yml` workflow
      builds both zips and attaches them to a new GitHub Release
      automatically.

## Chrome Web Store

Account: [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
(one-time $5 registration fee).

Upload: `.output/bleep-<version>-chrome.zip`.

Store listing needs:

- **Detailed description** (up to 16,000 chars) — paste-ready copy in all
  four languages lives in [STORE_LISTING.md](./STORE_LISTING.md). Expand on the one-line
  manifest description; explain the global-vs-per-site distinction and why
  `browsingData` + `optional_host_permissions` are used.
- **Icon** — 128×128 (already in `public/icon/128.png`).
- **Screenshots** — 1280×800 or 640×400, at least one required. Use
  `assets/*.png` or capture fresh ones from `.output/chrome-mv3`.
- **Category** — Productivity or Tools.
- **Privacy practices tab** (required for MV3 review):
  - Justify every permission (`storage`, `tabs`, `browsingData`, `history`, `contextMenus`,
    optional `*://*/*`; `scripting` and `cookies` are Firefox-only and not in
    the Chrome build) in the dashboard's permission
    justification fields — reviewers reject vague justifications.
  - Declare whether user data is collected: **no** — nothing leaves the
    device, no analytics, no remote code.
  - Link a **privacy policy** page (see below — required even for
    "we collect nothing" once you request `history`/`browsingData`).
- **Single purpose** description — Chrome requires the extension do one
  clearly-stated thing; "clear browsing data" satisfies this, don't let
  scope creep in later without updating the listing.

Review time: typically a few hours to a few days; `history` and broad host
permissions get manual review, expect the slower end initially.

## Firefox Add-ons (AMO)

Account: [addons.mozilla.org developer hub](https://addons.mozilla.org/developers/) (free).

Upload: `.output/bleep-<version>-firefox.zip` — **all submissions are signed by Mozilla**,
including self-distributed ones, so this step is mandatory even outside AMO.

Store listing needs:

- **Icon** — 128×128, same asset as Chrome.
- **Screenshots** — no hard size requirement, PNG/JPG.
- **Summary** (250 chars) and **description** (long form, supports basic
  markdown).
- **License** — pick one in the submission flow (or "All Rights Reserved").
- Firefox's review checks `browser_specific_settings.gecko.id` matches the
  submission and `strict_min_version` (currently `140.0`) is accurate for
  the MV3 APIs used.

AMO review is typically automated + fast for extensions with no remote
code and a clear permission set, which this qualifies for.

## Microsoft Edge Add-ons

Account: [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview)
(free).

Upload: the same `.output/bleep-<version>-chrome.zip` as Chrome — no
separate build needed.

Store listing needs the same assets as Chrome: description (reuse
[STORE_LISTING.md](./STORE_LISTING.md)), 128×128 logo, screenshots, privacy
policy URL, and the permission justifications below. Review usually takes a
few business days. Once live, add an Edge badge next to the Chrome/Firefox
ones in the README.

## Privacy policy

Both stores require one once `history` or broad host permissions are
requested. See [PRIVACY.md](./PRIVACY.md) — link it directly (GitHub
renders it as a page):

```
https://github.com/utopiaeh/bleep/blob/main/PRIVACY.md
```

## Permission justifications (copy-paste starting point)

| Permission           | Why                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`            | Persist user settings (theme, language, selected data types) locally.                                                                                                                                |
| `tabs`               | Read the active tab's URL/id to scope a "clear this site" action, and to list open tabs for per-site selection.                                                                                      |
| `browsingData`       | The core clearing mechanism — cache, cookies, storage, history, etc.                                                                                                                                 |
| `scripting`          | Firefox-only path: inject a content script into one open tab to clear page-scoped storage APIs that Firefox's `browsingData` can't filter by origin.                                                 |
| `cookies`            | Firefox-only path: read and delete cookies for the single site being cleared, because Firefox's `browsingData` can't filter cookies by origin.                                                       |
| `history`            | Let the user view and delete individual history entries, and include History in global clears.                                                                                                       |
| `contextMenus`       | Add a "Bleep: clear this site" entry to the page and toolbar-icon right-click menus.                                                                                                                 |
| `*://*/*` (optional) | Requested on-demand, only when the user first performs a per-site clear — needed to target `browsingData.remove({origins})` (Chromium) or inject the content script (Firefox) on that specific site. |

## Store badges

Neither badge can be bought or applied for directly — these keep Bleep eligible.

- **Firefox "Recommended"** — editorially selected by Mozilla; watch
  [Extension Workshop](https://extensionworkshop.com/documentation/publish/recommended-extensions/)
  for nomination rounds. Once recommended, every update gets a manual code
  review, so keep the source zip reproducible (`yarn zip:firefox`) and the
  permission set minimal.
- **Chrome "Featured"** — request it via the Chrome Web Store One Stop
  Support form ("Featured badge nomination") after the listing is polished.
- Both reward: minimal permissions with clear justifications (table above),
  no remote code or data collection, a localized listing (`public/_locales`
  covers name/description; paste the per-language long description in each
  dashboard), up-to-date screenshots from `assets/`, a privacy policy link,
  regular releases, and good ratings.
