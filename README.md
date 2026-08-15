# IMS SDAC Hymnal — Desktop Edition

This app is a web app in [Electron](https://www.electronjs.org/) so it runs
as a native window on Windows and macOS, and can be packaged for the
**Microsoft Store** (Windows) and the **Mac App Store** (macOS).

## Important: two separate stores

The Microsoft Store only distributes **Windows** apps. It does not install
software on macOS. Apple's equivalent is the **Mac App Store**, which is a
separate submission with its own developer account, signing, and review
process.

| Platform | Store | Format | Requires |
|---|---|---|---|
| Windows | Microsoft Store | `.msix`/`.appx` | Free Microsoft Partner Center account |
| macOS | Mac App Store | `.pkg` via `mas` build | Paid Apple Developer Program ($99/yr) + a Mac |

You can also skip the Mac App Store entirely and just distribute a signed
`.dmg` directly from your own site — no Apple review, no yearly fee (still
needs a $99/yr cert to notarize it, or Gatekeper will warn people on install).

This project is set up to build **either path** for macOS, and the Store path
for Windows.

## What's in this folder

```
main.js         — Electron entry point (opens the hymnal in a native window)
package.json    — electron-builder config for both stores
app/            — the hymnal web app itself (same files as the browser version)
build/icon.*    — app icons (.ico for Windows, .icns for macOS, .png for the window)
build/entitlements.mas.plist — required sandbox entitlements for Mac App Store
```

## 1. One-time setup (do this on your dev machine)

You'll need [Node.js](https://nodejs.org) 18+ installed. Then, in this folder:

```bash
npm install
```

Try it locally first:

```bash
npm start
```

You should see the hymnal open in its own window.

## 2. Building for Windows → Microsoft Store

Do this step on Windows (electron-builder's `appx` target requires the
Windows SDK, so it won't build on macOS/Linux).

1. **Register a free Microsoft Partner Center account**: https://partner.microsoft.com/dashboard
   Reserve your app name (e.g. "IMS SDAC Hymnal") — this gives you a
   Package/Identity Name and Publisher ID.
2. In `package.json`, replace the two placeholders under `"appx"`:
   - `publisher`: the `CN=...` value shown on your app's Identity page in
     Partner Center
   - `publisherDisplayName`: your registered publisher display name
3. Build the package:
   ```bash
   npm run dist:win
   ```
   This produces an `.appx`/`.msix` in `dist/`.
4. In Partner Center, create a new submission for your app, upload the
   package, fill in the store listing (description, screenshots, age
   rating), and submit for certification. Review typically takes 1–3 days.

If you'd rather skip the Store and just let people download an installer
from your own site instead, run `npm run dist:win-exe` for a normal
Windows installer (`.exe`, via NSIS) — no Partner Center needed.

## 3. Building for macOS

Do this step on a Mac (Apple's tools only run on macOS, and there's no way
around that for App Store submission).

**Option A — Mac App Store**
1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr).
2. Create an App ID, a "Mac App Store" distribution certificate, and an
   Installer certificate in your developer account (Xcode can do most of
   this for you automatically if you open the project once).
3. Build:
   ```bash
   npm run dist:mac-store
   ```
4. Submit through [App Store Connect](https://appstoreconnect.apple.com) —
   create a new macOS app entry, upload the build (via Transporter or
   Xcode), fill in the listing, submit for review.

**Option B — direct download (no App Store review)**
1. Still requires an Apple Developer account for a "Developer ID"
   certificate, so Gatekeeper doesn't block it on install.
2. Build:
   ```bash
   npm run dist:mac
   ```
3. Notarize the resulting `.dmg` with Apple's `notarytool` (electron-builder
   can automate this if you set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
   and `APPLE_TEAM_ID` environment variables — see the
   [electron-builder notarization docs](https://www.electron.build/configuration/mac#notarization)).
4. Host the `.dmg` yourself; people download and drag it to Applications.

## Notes

- The hymn data (`app/data.js`) is bundled directly into the app, so it
  works fully offline — no network access needed at runtime.
- The hymnal's fonts load from Google Fonts over the internet if available,
  falling back to system fonts when offline. If you want a fully offline
  desktop build with the exact intended typefaces, download the two font
  families (Fraunces, Source Serif 4) and reference local files in
  `app/styles.css` instead of the Google Fonts `<link>` in `app/index.html`
  — happy to do that for you if you'd like.
- To change the app icon, replace the files in `build/` (keep the same
  filenames) and rebuild.
- Both stores require basic listing assets you'll need to prepare yourself:
  a short description, a few screenshots of the running app, and an app
  icon (already included here) sized per each store's guidelines.
